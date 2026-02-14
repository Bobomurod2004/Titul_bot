"""
Yagona hisoblash (scoring) logikasi
"""
import json
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

def is_choice_correct(student_answer, correct_answer):
    """Tanlovli savolni tekshirish"""
    return str(student_answer).strip().upper() == str(correct_answer).strip().upper()

def is_writing_correct(student_answer, correct_answer):
    """Yozma savolni tekshirish (alternativ javoblar bilan)"""
    try:
        correct_parts = json.loads(correct_answer)
        if isinstance(correct_parts, list):
            if isinstance(student_answer, list):
                student_parts = student_answer
            elif isinstance(student_answer, str) and student_answer.startswith('['):
                try:
                    student_parts = json.loads(student_answer)
                except:
                    student_parts = [student_answer]
            else:
                student_parts = [student_answer]
                
            for i, alternatives in enumerate(correct_parts):
                part_answer = str(student_parts[i]).strip().lower() if i < len(student_parts) else ""
                if not any(str(alt).strip().lower() == part_answer for alt in alternatives):
                    return False
            return True
        else:
            return str(student_answer).strip().lower() == str(correct_answer).strip().lower()
    except Exception as e:
        logger.debug(f"Writing check error: {e}")
        return str(student_answer).strip().lower() == str(correct_answer).strip().lower()

def calculate_manual_score(student_answer, max_points):
    """Manual score ni tekshirish va limitlash"""
    try:
        score_val = Decimal(str(student_answer))
        score_val = max(Decimal('0'), min(score_val, max_points))
        is_correct = score_val >= (max_points * Decimal('0.5'))
        return score_val, is_correct
    except:
        return Decimal('0'), False

def get_question_result(question, student_answer):
    """Savol turiga qarab natijani hisoblash"""
    is_correct = False
    earned_points = Decimal('0')
    
    if question.question_type == 'choice':
        is_correct = is_choice_correct(student_answer, question.correct_answer)
        if is_correct:
            earned_points = question.points
            
    elif question.question_type == 'writing':
        is_correct = is_writing_correct(student_answer, question.correct_answer)
        if is_correct:
            earned_points = question.points
            
    elif question.question_type == 'manual':
        earned_points, is_correct = calculate_manual_score(student_answer, question.points)
        
    return is_correct, earned_points
