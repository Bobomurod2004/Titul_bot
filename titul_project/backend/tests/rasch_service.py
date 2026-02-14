import math
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

def get_latest_submissions_queryset(test):
    """
    Test uchun har bir talabaning faqat eng oxirgi urinishini qaytaradi.
    Telegram ID 0 bo'lsa Name orqali ajratadi.
    """
    from .models import Submission
    from django.db.models import OuterRef, Subquery, Case, When, F, Value as V, CharField
    from django.db.models.functions import Lower, Trim, Concat

    # Har bir unikal (ID, Ism) juftligi uchun eng oxirgi urinishni olamiz
    latest_id_subs = Submission.objects.filter(
        test=test,
        student_telegram_id=OuterRef('student_telegram_id'),
        student_name__iexact=OuterRef('student_name_exact')
    ).order_by('-submitted_at').values('id')[:1]
    
    all_latest_ids = Submission.objects.filter(test=test).annotate(
        student_name_exact=F('student_name')
    ).values('student_telegram_id', 'student_name_exact').annotate(
        latest_id=Subquery(latest_id_subs)
    ).values_list('latest_id', flat=True).distinct()
    
    return Submission.objects.filter(id__in=list(all_latest_ids))

def estimate_item_difficulty(responses):
    """
    Savolning qiyinchilik darajasini (beta) hisoblash.
    responses: [0, 1, 1, 0, ...] - ushbu savolga berilgan javoblar ro'yxati
    """
    n = len(responses)
    if n == 0:
        return 0.0
        
    r = sum(responses)

    # Ekstremal holatlarni (hamma to'g'ri yoki hamma noto'g'ri) tuzatish
    if r == 0:
        r = 0.5
    elif r == n:
        r = n - 0.5

    # Rasch Model: beta = ln((n - r) / r)
    # n-r: noto'g'ri yechganlar, r: to'g'ri yechganlar
    try:
        difficulty = math.log((n - r) / r)
        return difficulty
    except (ValueError, ZeroDivisionError):
        return 0.0

def estimate_student_ability(responses, difficulties, max_iter=50, tolerance=0.001):
    """
    Talabaning qobiliyat darajasini (theta) Newton-Raphson iteratsiyasi orqali hisoblash.
    responses: [0, 1, 0, ...] - talabaning javoblari (1=to'g'ri, 0=noto'g'ri)
    difficulties: [beta1, beta2, ...] - savollarning qiyinchilik darajalari
    """
    if not responses or len(responses) != len(difficulties):
        return 0.0

    # Hamma savol to'g'ri yoki hamma savol noto'g'ri holatini tekshirish
    r = sum(responses)
    n = len(responses)
    
    # Ekstremal holatlar uchun xom tuzatish (Standard Rasch adjustment)
    # Hamma noto'g'ri bo'lsa 0.5 ball, hamma to'g'ri bo'lsa n-0.5 ball deb hisoblanadi
    # Bu logitlar cheksizlikka qarab ketishini oldini oladi
    adj_r = float(r)
    if r == 0:
        adj_r = 0.5
    elif r == n:
        adj_r = n - 0.5

    # Boshlang'ich taxmin (theta)
    # theta = ln(to'g'ri / noto'g'ri)
    theta = math.log(adj_r / (n - adj_r))

    for i in range(max_iter):
        # P_i = e^(theta - beta_i) / (1 + e^(theta - beta_i))
        probabilities = []
        for beta in difficulties:
            try:
                # Overflow dan qochish uchun cheklash
                diff = max(-20, min(20, theta - beta))
                p = math.exp(diff) / (1 + math.exp(diff))
                probabilities.append(p)
            except OverflowError:
                probabilities.append(1.0 if (theta - beta) > 0 else 0.0)

        # f(theta) = sum(X_i) - sum(P_i)
        f_theta = sum(responses) - sum(probabilities)
        
        # f'(theta) = -sum(P_i * (1 - P_i))
        df_theta = -sum(p * (1 - p) for p in probabilities)

        if abs(df_theta) < 1e-9:
            break

        delta = f_theta / df_theta
        theta -= delta

        if abs(delta) < tolerance:
            break
            
    return theta

def scale_logit(theta, mean=50, std=15):
    """
    Logitni 0-100 shkalasiga o'tkazish.
    Odatda logitlar [-4, 4] oralig'ida bo'ladi.
    Default: mean=50, std=15 (Milliy sertifikatga yaqin shkala)
    """
    scaled = mean + (std * theta)
    # 0 va 100 oralig'ida cheklash
    return max(0, min(100, scaled))

def calibrate_test_items(test):
    """
    Testdagi barcha savollarning qiyinchilik darajasini (difficulty_logit) hisoblash.
    Barcha turdagi savollarni (choice, writing, manual) hisobga oladi.
    """
    # Har bir talabaning faqat eng oxirgi urinishini tanlab olamiz
    submissions = get_latest_submissions_queryset(test)
    
    if not submissions.exists():
        return False


    questions = test.questions.all().order_by('question_number')
    
    for question in questions:
        success_rates = []
        for sub in submissions:
            q_num_str = str(question.question_number)
            ans = sub.answers.get(q_num_str)
            
            # Savol turiga qarab muvaffaqiyat foizini (0.0 dan 1.0 gacha) aniqlash
            success_rate = 0.0
            if question.question_type == 'choice':
                if str(ans).strip().upper() == str(question.correct_answer).strip().upper():
                    success_rate = 1.0
            elif question.question_type == 'writing':
                import json
                try:
                    correct_parts = json.loads(question.correct_answer)
                    if isinstance(correct_parts, list):
                        student_parts = ans if isinstance(ans, list) else [ans]
                        match = True
                        for i, alternatives in enumerate(correct_parts):
                            student_part = str(student_parts[i]).strip().lower() if i < len(student_parts) else ""
                            if not any(str(alt).strip().lower() == student_part for alt in alternatives):
                                match = False
                                break
                        success_rate = 1.0 if match else 0.0
                    else:
                        success_rate = 1.0 if str(ans).strip().lower() == str(question.correct_answer).strip().lower() else 0.0
                except:
                    success_rate = 1.0 if str(ans).strip().lower() == str(question.correct_answer).strip().lower() else 0.0
            elif question.question_type == 'manual':
                # Manual savollarda ans bu berilgan ball
                try:
                    earned_points = float(str(ans))
                    max_points = float(question.points)
                    if max_points > 0:
                        success_rate = max(0.0, min(1.0, earned_points / max_points))
                except:
                    success_rate = 0.0
            
            success_rates.append(success_rate)
        
        # O'rtacha muvaffaqiyat darajasi orqali qiyinchilikni hisoblash
        difficulty = estimate_item_difficulty(success_rates)
        question.difficulty_logit = Decimal(str(difficulty))
        question.save()

    test.is_calibrated = True
    test.save()
    return True

def calculate_rasch_scores(test):
    """
    Testdagi barcha submissionlar uchun qobiliyat va ballni hisoblash.
    """
    if not test.is_calibrated:
        return False
        
    questions = test.questions.all().order_by('question_number')
    difficulties = [float(q.difficulty_logit) for q in questions]
    
    for submission in test.submissions.all():
        normalized_responses = []
        for question in questions:
            q_num_str = str(question.question_number)
            ans = submission.answers.get(q_num_str)
            
            success_rate = 0.0
            if question.question_type == 'choice':
                if str(ans).strip().upper() == str(question.correct_answer).strip().upper():
                    success_rate = 1.0
            elif question.question_type == 'writing':
                import json
                try:
                    correct_parts = json.loads(question.correct_answer)
                    if isinstance(correct_parts, list):
                        student_parts = ans if isinstance(ans, list) else [ans]
                        match = True
                        for i, alternatives in enumerate(correct_parts):
                            student_part = str(student_parts[i]).strip().lower() if i < len(student_parts) else ""
                            if not any(str(alt).strip().lower() == student_part for alt in alternatives):
                                match = False
                                break
                        success_rate = 1.0 if match else 0.0
                    else:
                        success_rate = 1.0 if str(ans).strip().lower() == str(question.correct_answer).strip().lower() else 0.0
                except:
                    success_rate = 1.0 if str(ans).strip().lower() == str(question.correct_answer).strip().lower() else 0.0
            elif question.question_type == 'manual':
                try:
                    earned_points = float(str(ans))
                    max_points = float(question.points)
                    if max_points > 0:
                        success_rate = max(0.0, min(1.0, earned_points / max_points))
                except:
                    success_rate = 0.0
            
            normalized_responses.append(success_rate)
            
        # Qobiliyatni hisoblash (0.0-1.0 oraliqdagi response'lar ham Newton-Raphson da ishlaydi)
        theta = estimate_student_ability(normalized_responses, difficulties)
        scaled = scale_logit(theta)
        
        submission.ability_logit = Decimal(str(theta))
        submission.scaled_score = Decimal(str(scaled))
        
        # Darajani va xabarlarni qayta hisoblash (modeldagi markazlashgan logikadan foydalanamiz)
        submission.calculate_score(send_notify=False)
        
    return True
