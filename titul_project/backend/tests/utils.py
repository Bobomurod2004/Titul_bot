import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime


def generate_pdf_report(test, submissions):
    """
    Test natijalari uchun professional PDF hisobot yaratish
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=1.5*cm, leftMargin=1.5*cm,
                           topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=colors.HexColor('#2563eb'), # Modern Blue
        spaceAfter=20,
        alignment=1,
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=15,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        leading=14
    )
    
    # 1. Header
    elements.append(Paragraph(f"{test.title}", header_style))
    
    meta_data = [
        [Paragraph(f"<b>Fan:</b> {test.subject}", meta_style), 
         Paragraph(f"<b>Test kodi:</b> {test.access_code}", meta_style)],
        [Paragraph(f"<b>Sana:</b> {test.created_at.strftime('%d.%m.%Y')}", meta_style), 
         Paragraph(f"<b>Ishtirokchilar:</b> {submissions.count()} ta", meta_style)]
    ]
    meta_table = Table(meta_data, colWidths=[9*cm, 9*cm])
    meta_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.5*cm))
    
    # 2. Overall Statistics
    elements.append(Paragraph("Umumiy Statistika", section_style))
    
    avg_score = test.average_score
    max_score = test.max_score
    q_count = test.questions.count()
    
    stats_data = [
        ['O\'rtacha Ball', 'Eng Yuqori Ball', 'Maksimal Imkoniyat'],
        [f"{avg_score}", f"{max_score}", f"{test.total_points}"]
    ]
    stats_table = Table(stats_data, colWidths=[6*cm, 6*cm, 6*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#475569')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 0.8*cm))
    
    # 3. Answer Key (To'g'ri javoblar shakli)
    elements.append(Paragraph("Testning To'g'ri Javoblari (Kalitlar)", section_style))
    
    questions = test.questions.all().order_by('question_number')
    key_data = []
    row = []
    for i, q in enumerate(questions):
        if q.question_type == 'writing':
            try:
                import json
                parts = json.loads(q.correct_answer)
                if isinstance(parts, list):
                    # Birinchi muqobillarni vergul bilan chiqarish
                    part_str = " | ".join([str(p[0]) if p else "?" for p in parts])
                    row.append(f"{q.question_number}. {part_str}")
                else:
                    row.append(f"{q.question_number}. {q.correct_answer}")
            except:
                row.append(f"{q.question_number}. {q.correct_answer}")
        else:
            row.append(f"{q.question_number}. {q.correct_answer}")
            
        if (i + 1) % 5 == 0:
            key_data.append(row)
            row = []
    if row:
        while len(row) < 5:
            row.append("")
        key_data.append(row)
        
    if key_data:
        key_table = Table(key_data, colWidths=[3.6*cm]*5)
        key_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
        ]))
        elements.append(key_table)
    else:
        elements.append(Paragraph("Savollar mavjud emas", meta_style))
    elements.append(Spacer(1, 1*cm))
    
    # 4. Results Table (Grouped by Student Attempts)
    elements.append(Paragraph("O'quvchilar Natijalari (Urinishlar bo'yicha)", section_style))
    
    if submissions.exists():
        from collections import defaultdict
        # Guruhlarni yig'ish (Telegram ID bo'yicha, bo'lmasa ism bo'yicha)
        student_map = defaultdict(list)
        for sub in submissions:
            # Eng yangi urinishlar ro'yxatning oxirida bo'lishi uchun tartiblashda e'tibor berish kerak
            # View-dan submissions ordering=['-score'] keladi, lekin bizga vaqt bo'yicha kerak bo'lishi mumkin
            student_map[sub.student_telegram_id or sub.student_name].append(sub)
        
        # Talabalarni eng yuqori bali bo'yicha tartiblash
        sorted_students = sorted(student_map.items(), key=lambda x: max(s.score for s in x[1]), reverse=True)
        
        # Maksimal urinishlar sonini aniqlash (ustunlar uchun)
        max_attempts = 0
        if sorted_students:
            max_attempts = min(max(len(subs) for _, subs in sorted_students), 6) # Maksimal 6 ta ustun
            
        header = ['№', 'Ism-Familiya']
        for i in range(1, max_attempts + 1):
            header.append(f"{i}-urinish")
        header.append("Eng yaxshi")
        
        table_data = [header]
        
        q_count = test.questions.count()
        
        for idx, (student_key, student_subs) in enumerate(sorted_students, 1):
            # Urinishlarni vaqt bo'yicha tartiblash
            ordered_subs = sorted(student_subs, key=lambda x: x.submitted_at)
            
            row = [str(idx), ordered_subs[0].student_name]
            best_score = 0
            
            for i in range(max_attempts):
                if i < len(ordered_subs):
                    score = float(ordered_subs[i].score)
                    row.append(f"{score}")
                    if score > best_score:
                        best_score = score
                else:
                    row.append("-")
            
            row.append(f"<b>{best_score} / {test.total_points}</b>")
            table_data.append(row)
            
        # Dinamik ustun kengliklari
        col_widths = [0.8*cm, 6.0*cm] # № va Ism
        for _ in range(max_attempts):
            col_widths.append(1.8*cm) # Urinishlar
        col_widths.append(1.8*cm) # Eng yaxshi
        
        results_table = Table(table_data, colWidths=col_widths)
        results_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'), # Ismlarni chapga
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
        ]))
        elements.append(results_table)
        elements.append(Spacer(1, 0.5*cm))
        elements.append(Paragraph(f"<font color='#64748b' size='8'>* Eslatma: Jadvalda ko'pi bilan {max_attempts} ta urinish ko'rsatildi.</font>", meta_style))
    else:
        elements.append(Paragraph("Ishtirokchilar mavjud emas", meta_style))
    
    # Footer
    elements.append(Spacer(1, 2*cm))
    footer_text = f"© {datetime.now().year} Titul Test Platformasi | Hisobot yaratildi: {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', alignment=1, fontSize=8, textColor=colors.grey)))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
