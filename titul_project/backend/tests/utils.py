import io
from reportlab.lib.pagesizes import A4
from collections import Counter, defaultdict
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime


def generate_pdf_report(test, submissions):
    """
    Test natijalari uchun professional PDF hisobot yaratish (Milliy Sertifikat standarti)
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.0*cm, leftMargin=1.0*cm,
                           topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom colors from screenshots
    primary_color = colors.HexColor('#4c1d95') # Purple for headers (Screenshot 1)
    stat_color = colors.HexColor('#2563eb')    # Blue for stats (Screenshot 2)
    border_color = colors.black
    text_color = colors.HexColor('#1e293b')
    
    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=primary_color,
        spaceAfter=15,
        alignment=1,
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=text_color,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )

    cell_text_style = ParagraphStyle(
        'CellTextStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=text_color,
        alignment=0, # Left
        wordWrap='CJK', # Wrap numbers and text
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        leading=14
    )
    
    # helper for checking correctness (consistent with models.py)
    def check_is_correct(question, ans):
        if question.question_type == 'choice':
            return str(ans).strip().upper() == str(question.correct_answer).strip().upper()
        elif question.question_type == 'writing':
            import json
            try:
                correct_parts = json.loads(question.correct_answer)
                if isinstance(correct_parts, list):
                    if isinstance(ans, list):
                        student_parts = ans
                    elif isinstance(ans, str) and str(ans).startswith('['):
                        try:
                            student_parts = json.loads(ans)
                        except:
                            student_parts = [ans]
                    else:
                        student_parts = [ans]
                        
                    for i, alternatives in enumerate(correct_parts):
                        student_part = str(student_parts[i]).strip().lower() if i < len(student_parts) else ""
                        if not any(str(alt).strip().lower() == student_part for alt in alternatives):
                            return False
                    return True
                return str(ans).strip().lower() == str(question.correct_answer).strip().lower()
            except:
                return str(ans).strip().lower() == str(question.correct_answer).strip().lower()
        elif question.question_type == 'manual':
            try:
                # 50% threshold for visual "correct" indicator in PDF
                return float(str(ans)) >= float(question.points) * 0.5
            except:
                return False
        return False

    # 1. Header
    elements.append(Paragraph(f"{test.title}", header_style))
    
    q_count = test.questions.count()
    questions = test.questions.all().order_by('question_number')
    q_range = f"1-{q_count}"
    
    # Pre-process unique students latest attempts for stats
    # Unified grouping: use composite (ID, Name) key for all students
    student_latest = {}
    for sub in submissions:
        # Key: ID + Name (normalized)
        key = f"{sub.student_telegram_id}_{sub.student_name.strip().lower()}"
        if key not in student_latest:
            student_latest[key] = sub
        else:
            # Overwrite if current sub is newer or has higher attempt number
            if sub.submitted_at > student_latest[key].submitted_at:
                student_latest[key] = sub
    
    latest_subs_list = list(student_latest.values())
    participant_count = len(latest_subs_list)

    meta_data = [
        [Paragraph(f"<b>Fan:</b> {test.subject} ({q_range}-savollar)", meta_style), 
         Paragraph(f"<b>Test kodi:</b> {test.access_code}", meta_style)],
        [Paragraph(f"<b>Sana:</b> {test.created_at.strftime('%d.%m.%Y %H:%M')}", meta_style), 
         Paragraph(f"<b>Ishtirokchilar:</b> {test.submissions_count} ta", meta_style)]
    ]
    meta_table = Table(meta_data, colWidths=[9.5*cm, 9.5*cm])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(meta_table)
    
    # Darajalar statistikasi (Grade Distribution) based on latest attempts
    if latest_subs_list:
        from collections import Counter
        grades = [s.grade for s in latest_subs_list if s.grade]
        grade_counts = Counter(grades)
        grade_order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'F']
        sum_parts = []
        for g in grade_order:
            if grade_counts[g] > 0:
                sum_parts.append(f"<b>{g}:</b> {grade_counts[g]} ta")
        
        if sum_parts:
            elements.append(Spacer(1, 0.3*cm))
            elements.append(Paragraph(f"<b>Darajalar statistikasi:</b> {', '.join(sum_parts)}", meta_style))

    elements.append(Spacer(1, 0.5*cm))
    
    if test.is_calibrated:
        from django.db.models import Avg
        # Filter average calculation to only latest attempts
        latest_ids = [s.id for s in latest_subs_list]
        avg_rasch = test.submissions.filter(id__in=latest_ids).aggregate(Avg('scaled_score'))['scaled_score__avg']
        stats_text = f"<b>Rasch O'rtacha:</b> {round(avg_rasch, 1) if avg_rasch else 0} ball"
        elements.append(Paragraph(stats_text, meta_style))
        elements.append(Spacer(1, 0.3*cm))

    # 3. Jadval 1: O'quvchilarning batafsil natijalari
    elements.append(Paragraph("1. O'quvchilarning batafsil natijalari", section_style))
    
    if latest_subs_list:
        is_multiple = test.submission_mode == 'multiple'
        
        if is_multiple:
            # Group by student_telegram_id + student_name
            grouped = defaultdict(list)
            for sub in submissions:
                key = f"{sub.student_telegram_id}_{sub.student_name.strip().lower()}"
                grouped[key].append(sub)
                
            # Each student's attempts sorted by time
            for key in grouped:
                grouped[key].sort(key=lambda x: x.submitted_at)
                
            # Identify if this is a points-based test (manual grading or custom points)
            is_points_based = any(q.question_type in ['manual', 'writing'] or float(q.points) != 1.0 for q in questions)
            
            # Limit to 3 attempt columns for PDF width
            max_attempts_found = max(len(subs) for subs in grouped.values()) if grouped else 0
            num_attempt_cols = min(max_attempts_found, 3)
            
            header = ['Ism']
            for i in range(1, num_attempt_cols + 1):
                header.append(f"{i}-{ 'ball' if is_points_based else 'urinish' }")
            header += ['Rash', 'Umumiy', 'Daraja', 'Xato']
            table_data = [header]
            
            # Sort students by their LATEST attempt score
            sorted_students = sorted(grouped.values(), 
                                     key=lambda x: x[-1].scaled_score if test.is_calibrated else x[-1].score, 
                                     reverse=True)
            
            for student_subs in sorted_students:
                latest_sub = student_subs[-1]
                
                # Latest attempt stats for the final columns
                wrong_questions = []
                for q in questions:
                    ans = latest_sub.answers.get(str(q.question_number))
                    if not check_is_correct(q, ans):
                        wrong_questions.append(str(q.question_number))
                
                xato_str = ", ".join(wrong_questions)
                row = [Paragraph(latest_sub.student_name, cell_text_style)]
                
                # Add attempt-specific results
                for i in range(num_attempt_cols):
                    if i < len(student_subs):
                        s = student_subs[i]
                        if is_points_based:
                            # Show Score for points-based tests
                            row.append(f"{s.score}")
                        else:
                            # Show Correct | Wrong counts for traditional tests
                            c = sum(1 for q in questions if check_is_correct(q, s.answers.get(str(q.question_number))))
                            w = q_count - c
                            row.append(f"{c} | {w}")
                    else:
                        row.append("-")
                
                row.append(f"{latest_sub.scaled_score if test.is_calibrated else '-'}")
                row.append(f"{latest_sub.score}")
                row.append(f"{latest_sub.grade or '-'}")
                row.append(Paragraph(xato_str, cell_text_style))
                table_data.append(row)

            # Col widths calculation
            name_w = 4.0*cm
            attempt_w = 1.35*cm
            stat_w = 1.4*cm
            total_attempt_w = num_attempt_cols * attempt_w
            total_stat_w = 4 * stat_w
            err_w = 19.0*cm - name_w - total_attempt_w - total_stat_w
            
            col_widths = [name_w] + [attempt_w]*num_attempt_cols + [stat_w]*4 + [err_w]
            
        else:
            # Single attempt mode
            header = ['Ism', 'To\'g\'ri', 'Rash', 'Umumiy', 'Daraja', 'Xato']
            table_data = [header]
            
            sorted_subs = sorted(latest_subs_list, key=lambda x: x.scaled_score if test.is_calibrated else x.score, reverse=True)
            
            for sub in sorted_subs:
                correct_count = 0
                wrong_questions = []
                for q in questions:
                    ans = sub.answers.get(str(q.question_number))
                    if check_is_correct(q, ans):
                        correct_count += 1
                    else:
                        wrong_questions.append(str(q.question_number))
                
                xato_str = ", ".join(wrong_questions)
                row = [
                    Paragraph(sub.student_name, cell_text_style),
                    f"{correct_count}",
                    f"{sub.scaled_score if test.is_calibrated else '-'}",
                    f"{sub.score}",
                    f"{sub.grade or '-'}",
                    Paragraph(xato_str, cell_text_style)
                ]
                table_data.append(row)
                
            col_widths = [5.0*cm, 1.8*cm, 1.8*cm, 1.8*cm, 1.8*cm, 6.8*cm]
            
        res_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        res_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(res_table)
    
    elements.append(Spacer(1, 1*cm))

    # 4. Jadval 2: Savollar statistikasi
    q_total = test.questions.count()
    elements.append(Paragraph(f"2. Savollar statistikasi (1-{q_total})", section_style))
    
    if test.is_calibrated:
        header2 = ['Savol', 'To\'g\'ri', 'Foiz', 'Qiyinchilik']
        stats_data2 = [header2]
        
        for q in questions:
            correct = 0
            for sub in latest_subs_list:
                ans = sub.answers.get(str(q.question_number))
                if check_is_correct(q, ans):
                    correct += 1
            
            total_count = participant_count
            percent = (correct / total_count * 100) if total_count > 0 else 0
            
            diff_val = float(q.difficulty_logit)
            if diff_val != 0:
                if diff_val < -0.5: diff_txt = "Oson"
                elif diff_val > 0.5: diff_txt = "Qiyin"
                else: diff_txt = "O'rta"
            else:
                if percent >= 70: diff_txt = "Oson"
                elif percent <= 30: diff_txt = "Qiyin"
                else: diff_txt = "O'rta"
            
            stats_data2.append([
                f"{q.question_number}",
                f"{correct}/{total_count}",
                f"{round(percent, 1)}%",
                diff_txt
            ])
            
        stats_table2 = Table(stats_data2, colWidths=[4.7*cm]*4, repeatRows=1)
        stats_table2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), stat_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#eff6ff')])
        ]))
        elements.append(stats_table2)
    else:
        status_msg = "Savollar hali kalibratsiya qilinmagan (Natijalar xom ball bo'yicha)."
        if not test.is_active: status_msg = "Savollar kalibratsiya qilinmoqda (Iltimos, kutib turing)..."
        elements.append(Paragraph(status_msg, meta_style))

    # 5. Answer Key
    elements.append(Spacer(1, 1*cm))
    elements.append(Paragraph("Testning To'g'ri Javoblari (Kalitlar)", section_style))
    
    key_data = []
    row = []
    for i, q in enumerate(questions):
        # Yopiq test (choice) uchun javobni tozalab ko'rsatamiz
        if q.question_type == 'choice':
            q_ans = str(q.correct_answer).strip().upper()
        elif q.question_type == 'writing':
            # Yozma savol qismlarini ko'rsatishga harakat qilamiz
            try:
                import json
                parts = json.loads(q.correct_answer)
                if isinstance(parts, list):
                    q_ans = "/".join([str(p[0]) for p in parts if p])[:10]
                else:
                    q_ans = str(q.correct_answer)[:10]
            except:
                q_ans = str(q.correct_answer)[:10]
        else:
            q_ans = f"max:{q.points}"
            
        row.append(Paragraph(f"<b>{q.question_number}</b>. {q_ans}", cell_text_style))
        if (i + 1) % 5 == 0:
            key_data.append(row)
            row = []
    if row:
        while len(row) < 5: row.append("")
        key_data.append(row)
        
    if key_data:
        key_table = Table(key_data, colWidths=[3.8*cm]*5)
        key_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER')
        ]))
        elements.append(key_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
