"""
Medical-grade PDF Report Generator for Earlyrisk AI
Generates professional health reports with risk scores, charts, and personalized recommendations.
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie


# Brand colors
PRIMARY_COLOR = colors.HexColor("#4F46E5")  # Indigo
PRIMARY_LIGHT = colors.HexColor("#818CF8")
SECONDARY_COLOR = colors.HexColor("#10B981")  # Green
WARNING_COLOR = colors.HexColor("#F59E0B")  # Amber
DANGER_COLOR = colors.HexColor("#EF4444")  # Red
TEXT_COLOR = colors.HexColor("#1E293B")  # Slate 800
TEXT_MUTED = colors.HexColor("#64748B")  # Slate 500
BACKGROUND_LIGHT = colors.HexColor("#F8FAFC")  # Slate 50
BORDER_COLOR = colors.HexColor("#E2E8F0")  # Slate 200


def get_risk_color(risk_pct: float) -> colors.Color:
    """Return color based on risk percentage."""
    if risk_pct < 30:
        return SECONDARY_COLOR  # Green - Low
    elif risk_pct < 60:
        return WARNING_COLOR  # Amber - Medium
    else:
        return DANGER_COLOR  # Red - High


def get_risk_level(risk_pct: float) -> str:
    """Return risk level text based on percentage."""
    if risk_pct < 30:
        return "Low Risk"
    elif risk_pct < 60:
        return "Moderate Risk"
    else:
        return "High Risk"


def create_styles() -> Dict[str, ParagraphStyle]:
    """Create custom paragraph styles for the report."""
    styles = getSampleStyleSheet()
    
    custom_styles = {
        'Title': ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            textColor=PRIMARY_COLOR,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
        ),
        'Subtitle': ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=12,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            spaceAfter=30,
        ),
        'Heading1': ParagraphStyle(
            'CustomHeading1',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=PRIMARY_COLOR,
            spaceBefore=20,
            spaceAfter=12,
            fontName='Helvetica-Bold',
        ),
        'Heading2': ParagraphStyle(
            'CustomHeading2',
            parent=styles['Heading2'],
            fontSize=13,
            textColor=TEXT_COLOR,
            spaceBefore=14,
            spaceAfter=8,
            fontName='Helvetica-Bold',
        ),
        'Body': ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            textColor=TEXT_COLOR,
            spaceAfter=8,
            leading=14,
            alignment=TA_JUSTIFY,
        ),
        'BodyBold': ParagraphStyle(
            'BodyBold',
            parent=styles['Normal'],
            fontSize=10,
            textColor=TEXT_COLOR,
            fontName='Helvetica-Bold',
        ),
        'Small': ParagraphStyle(
            'Small',
            parent=styles['Normal'],
            fontSize=9,
            textColor=TEXT_MUTED,
            spaceAfter=4,
        ),
        'RiskHigh': ParagraphStyle(
            'RiskHigh',
            parent=styles['Normal'],
            fontSize=11,
            textColor=DANGER_COLOR,
            fontName='Helvetica-Bold',
        ),
        'RiskMedium': ParagraphStyle(
            'RiskMedium',
            parent=styles['Normal'],
            fontSize=11,
            textColor=WARNING_COLOR,
            fontName='Helvetica-Bold',
        ),
        'RiskLow': ParagraphStyle(
            'RiskLow',
            parent=styles['Normal'],
            fontSize=11,
            textColor=SECONDARY_COLOR,
            fontName='Helvetica-Bold',
        ),
        'Disclaimer': ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            leading=10,
        ),
        'Footer': ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
        ),
    }
    
    return custom_styles


def create_color_bar(width: float, height: float, percentage: float, risk_color: colors.Color) -> Drawing:
    """Create a colored progress bar showing risk percentage."""
    d = Drawing(width, height)
    
    # Background bar
    bg = Rect(0, 0, width, height, fillColor=BACKGROUND_LIGHT, strokeColor=BORDER_COLOR, strokeWidth=0.5)
    d.add(bg)
    
    # Filled portion
    filled_width = (percentage / 100) * width
    if filled_width > 0:
        fg = Rect(0, 0, filled_width, height, fillColor=risk_color, strokeColor=None)
        d.add(fg)
    
    return d


def create_risk_table_row(name: str, percentage: float, styles: Dict[str, ParagraphStyle]) -> List:
    """Create a row for the disease risk table with color bar."""
    risk_color = get_risk_color(percentage)
    risk_level = get_risk_level(percentage)
    
    # Select appropriate style
    if percentage >= 60:
        style_key = 'RiskHigh'
    elif percentage >= 30:
        style_key = 'RiskMedium'
    else:
        style_key = 'RiskLow'
    
    color_bar = create_color_bar(120, 16, percentage, risk_color)
    
    return [
        Paragraph(name, styles['BodyBold']),
        f"{percentage:.1f}%",
        color_bar,
        Paragraph(risk_level, styles[style_key]),
    ]


def generate_health_report(
    analysis_data: Dict[str, Any],
    patient_name: str = "Patient",
    report_date: Optional[datetime] = None,
) -> bytes:
    """
    Generate a professional medical PDF report.
    
    Args:
        analysis_data: Dictionary containing analysis results from Supabase
        patient_name: Name of the patient
        report_date: Date of the report (defaults to now)
    
    Returns:
        PDF file as bytes
    """
    if report_date is None:
        report_date = datetime.utcnow()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=60,
        bottomMargin=60,
    )
    
    styles = create_styles()
    story: List = []
    
    # ========================================
    # HEADER SECTION
    # ========================================
    
    # Logo and Title
    header_data = [
        [
            Paragraph("🏥", ParagraphStyle('Logo', fontSize=32)),
            Paragraph("<b>Earlyrisk AI</b>", styles['Title']),
        ]
    ]
    header_table = Table(header_data, colWidths=[50, 400])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(header_table)
    
    story.append(Paragraph(
        "AI-Powered Health Risk Assessment Report",
        styles['Subtitle']
    ))
    
    # Patient Info Box
    patient_info_data = [
        ["Patient Name:", patient_name, "Report Date:", report_date.strftime("%B %d, %Y")],
        ["Report ID:", str(analysis_data.get('id', 'N/A'))[:8], "Analysis Source:", analysis_data.get('source', 'Form').title()],
    ]
    patient_table = Table(patient_info_data, colWidths=[80, 170, 80, 150])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BACKGROUND_LIGHT),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_COLOR),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BOX', (0, 0), (-1, -1), 1, PRIMARY_COLOR),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 20))
    
    # ========================================
    # SECTION 1: HEALTH SUMMARY
    # ========================================
    
    story.append(Paragraph("1. Health Summary", styles['Heading1']))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceAfter=12))
    
    # Calculate overall risk
    diabetes_risk = float(analysis_data.get('diabetes_risk', 0))
    heart_risk = float(analysis_data.get('heart_risk', 0))
    liver_risk = float(analysis_data.get('liver_risk', 0))
    depression_risk = float(analysis_data.get('depression_risk', 0))
    overall_risk = float(analysis_data.get('overall_risk', 0)) or (
        (diabetes_risk + heart_risk + liver_risk + depression_risk) / 4
    )
    
    overall_color = get_risk_color(overall_risk)
    overall_level = get_risk_level(overall_risk)
    
    # Key metrics summary
    full_analysis = analysis_data.get('full_analysis', {}) or {}
    advice_list = full_analysis.get('advice', []) or []
    
    # Get warnings from advice
    warnings = [a for a in advice_list if a.get('severity') == 'high']
    key_diseases = []
    if diabetes_risk >= 30:
        key_diseases.append("Diabetes")
    if heart_risk >= 30:
        key_diseases.append("Heart Disease")
    if liver_risk >= 30:
        key_diseases.append("Liver Disease")
    if depression_risk >= 30:
        key_diseases.append("Mental Health")
    
    summary_text = f"""
    <b>Overall Risk Assessment:</b> {overall_risk:.1f}% ({overall_level})<br/><br/>
    
    <b>Key Areas of Concern:</b> {', '.join(key_diseases) if key_diseases else 'None identified'}<br/><br/>
    
    <b>AI Early Warnings:</b> {len(warnings)} high-priority alert(s) detected<br/><br/>
    
    This report provides a comprehensive analysis of your health metrics using advanced AI algorithms.
    The risk scores below are calculated based on your provided health data and established medical guidelines.
    """
    
    story.append(Paragraph(summary_text, styles['Body']))
    
    # Overall Risk Highlight Box
    if overall_risk >= 60:
        alert_text = "⚠️ ELEVATED RISK DETECTED - Please consult a healthcare provider"
        alert_color = DANGER_COLOR
    elif overall_risk >= 30:
        alert_text = "⚡ MODERATE RISK - Regular monitoring recommended"
        alert_color = WARNING_COLOR
    else:
        alert_text = "✅ LOW RISK - Continue maintaining healthy habits"
        alert_color = SECONDARY_COLOR
    
    alert_data = [[Paragraph(f"<b>{alert_text}</b>", ParagraphStyle(
        'Alert', fontSize=11, textColor=colors.white, alignment=TA_CENTER
    ))]]
    alert_table = Table(alert_data, colWidths=[450])
    alert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), alert_color),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(Spacer(1, 10))
    story.append(alert_table)
    story.append(Spacer(1, 20))
    
    # ========================================
    # SECTION 2: DISEASE RISKS
    # ========================================
    
    story.append(Paragraph("2. Disease Risk Analysis", styles['Heading1']))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceAfter=12))
    
    story.append(Paragraph(
        "The following table shows your risk percentages for major health conditions. "
        "These scores are derived from your health metrics and AI-powered analysis.",
        styles['Body']
    ))
    story.append(Spacer(1, 10))
    
    # Disease risk table
    risk_headers = ['Condition', 'Risk %', 'Risk Level', 'Status']
    risk_rows = [
        risk_headers,
        create_risk_table_row("Diabetes", diabetes_risk, styles),
        create_risk_table_row("Heart Disease", heart_risk, styles),
        create_risk_table_row("Fatty Liver", liver_risk, styles),
        create_risk_table_row("Depression/Mental Health", depression_risk, styles),
    ]
    
    risk_table = Table(risk_rows, colWidths=[150, 60, 130, 100])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BACKGROUND_LIGHT]),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 20))
    
    # ========================================
    # SECTION 3: RISK CONTRIBUTORS
    # ========================================
    
    story.append(Paragraph("3. Risk Contributors & Health Metrics", styles['Heading1']))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceAfter=12))
    
    story.append(Paragraph(
        "These factors from your health data contribute to your overall risk assessment:",
        styles['Body']
    ))
    story.append(Spacer(1, 10))
    
    # Extract metrics
    bmi = analysis_data.get('bmi')
    sleep = analysis_data.get('sleep_hours')
    cholesterol = analysis_data.get('cholesterol_mgdl')
    stress = analysis_data.get('stress_level')
    family_history = analysis_data.get('family_history', 0)
    bp_systolic = analysis_data.get('bp_systolic')
    bp_diastolic = analysis_data.get('bp_diastolic')
    sugar = analysis_data.get('sugar_mgdl')
    hba1c = analysis_data.get('hba1c_pct')
    exercise = analysis_data.get('exercise_mins_per_week')
    
    def get_metric_status(name: str, value: Any) -> tuple:
        """Get status and color for a metric."""
        if value is None:
            return "Not provided", TEXT_MUTED
        
        if name == 'bmi':
            if value < 18.5:
                return "Underweight", WARNING_COLOR
            elif value < 25:
                return "Normal", SECONDARY_COLOR
            elif value < 30:
                return "Overweight", WARNING_COLOR
            else:
                return "Obese", DANGER_COLOR
        elif name == 'sleep':
            if 7 <= value <= 9:
                return "Optimal", SECONDARY_COLOR
            elif 6 <= value < 7 or 9 < value <= 10:
                return "Suboptimal", WARNING_COLOR
            else:
                return "Poor", DANGER_COLOR
        elif name == 'cholesterol':
            if value < 200:
                return "Desirable", SECONDARY_COLOR
            elif value < 240:
                return "Borderline High", WARNING_COLOR
            else:
                return "High", DANGER_COLOR
        elif name == 'stress':
            if value <= 3:
                return "Low", SECONDARY_COLOR
            elif value <= 6:
                return "Moderate", WARNING_COLOR
            else:
                return "High", DANGER_COLOR
        elif name == 'bp_systolic':
            if value < 120:
                return "Normal", SECONDARY_COLOR
            elif value < 130:
                return "Elevated", WARNING_COLOR
            elif value < 140:
                return "High Stage 1", WARNING_COLOR
            else:
                return "High Stage 2", DANGER_COLOR
        elif name == 'sugar':
            if value < 100:
                return "Normal", SECONDARY_COLOR
            elif value < 126:
                return "Prediabetes", WARNING_COLOR
            else:
                return "Diabetes Range", DANGER_COLOR
        elif name == 'hba1c':
            if value < 5.7:
                return "Normal", SECONDARY_COLOR
            elif value < 6.5:
                return "Prediabetes", WARNING_COLOR
            else:
                return "Diabetes Range", DANGER_COLOR
        elif name == 'exercise':
            if value >= 150:
                return "Active", SECONDARY_COLOR
            elif value >= 75:
                return "Moderate", WARNING_COLOR
            else:
                return "Sedentary", DANGER_COLOR
        
        return "N/A", TEXT_MUTED
    
    # Contributors table
    contributors_data = [
        ['Metric', 'Value', 'Status', 'Recommendation'],
    ]
    
    metrics_config = [
        ('BMI', bmi, 'bmi', f"{bmi:.1f} kg/m²" if bmi else "N/A", "Maintain 18.5-24.9"),
        ('Blood Pressure', bp_systolic, 'bp_systolic', f"{bp_systolic:.0f}/{bp_diastolic:.0f} mmHg" if bp_systolic else "N/A", "Target <120/80"),
        ('Fasting Glucose', sugar, 'sugar', f"{sugar:.0f} mg/dL" if sugar else "N/A", "Target <100"),
        ('HbA1c', hba1c, 'hba1c', f"{hba1c:.1f}%" if hba1c else "N/A", "Target <5.7%"),
        ('Cholesterol', cholesterol, 'cholesterol', f"{cholesterol:.0f} mg/dL" if cholesterol else "N/A", "Target <200"),
        ('Sleep', sleep, 'sleep', f"{sleep:.1f} hrs/day" if sleep else "N/A", "Target 7-9 hrs"),
        ('Stress Level', stress, 'stress', f"{stress}/10" if stress is not None else "N/A", "Target <4/10"),
        ('Exercise', exercise, 'exercise', f"{exercise:.0f} mins/week" if exercise else "N/A", "Target ≥150"),
        ('Family History', family_history, None, "Yes" if family_history else "No", "Genetic factors"),
    ]
    
    for name, value, metric_key, display_val, rec in metrics_config:
        if metric_key:
            status, color = get_metric_status(metric_key, value)
        else:
            status = "Risk Factor" if family_history else "No Risk"
            color = WARNING_COLOR if family_history else SECONDARY_COLOR
        
        status_style = ParagraphStyle('Status', fontSize=9, textColor=color, fontName='Helvetica-Bold')
        contributors_data.append([
            name,
            display_val,
            Paragraph(status, status_style),
            rec,
        ])
    
    contributors_table = Table(contributors_data, colWidths=[100, 100, 100, 140])
    contributors_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BACKGROUND_LIGHT]),
    ]))
    story.append(contributors_table)
    story.append(Spacer(1, 20))
    
    # ========================================
    # SECTION 4: PERSONALIZED PLAN
    # ========================================
    
    story.append(Paragraph("4. Personalized Health Plan", styles['Heading1']))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY_COLOR, spaceAfter=12))
    
    story.append(Paragraph(
        "Based on your risk assessment, here are personalized recommendations to improve your health:",
        styles['Body']
    ))
    story.append(Spacer(1, 10))
    
    # Categorize advice
    diet_advice = []
    exercise_advice = []
    sleep_advice = []
    medical_advice = []
    other_advice = []
    
    for advice in advice_list:
        text = advice.get('text', advice.get('advice', ''))
        category = advice.get('category', '').lower()
        
        if not text:
            continue
            
        if 'diet' in category or 'nutrition' in category or 'food' in text.lower():
            diet_advice.append(text)
        elif 'exercise' in category or 'physical' in category or 'exercise' in text.lower():
            exercise_advice.append(text)
        elif 'sleep' in category or 'sleep' in text.lower():
            sleep_advice.append(text)
        elif 'medical' in category or 'doctor' in text.lower() or 'checkup' in text.lower():
            medical_advice.append(text)
        else:
            other_advice.append(text)
    
    # Add default advice if categories are empty
    if not diet_advice:
        diet_advice = [
            "Follow a balanced diet rich in fruits, vegetables, and whole grains",
            "Limit processed foods, saturated fats, and added sugars",
            "Stay hydrated with at least 8 glasses of water daily",
        ]
    
    if not exercise_advice:
        exercise_advice = [
            "Aim for at least 150 minutes of moderate exercise per week",
            "Include both cardio and strength training activities",
            "Take regular breaks from sitting every 30-60 minutes",
        ]
    
    if not sleep_advice:
        sleep_advice = [
            "Maintain a consistent sleep schedule of 7-9 hours",
            "Create a relaxing bedtime routine",
            "Limit screen time before bed",
        ]
    
    if not medical_advice:
        medical_advice = [
            "Schedule regular health checkups with your physician",
            "Monitor your blood pressure and glucose levels",
            "Keep track of any symptoms or health changes",
        ]
    
    def create_advice_section(title: str, icon: str, items: List[str], color: colors.Color):
        section_header = f"{icon} {title}"
        story.append(Paragraph(section_header, styles['Heading2']))
        
        for item in items[:4]:  # Limit to 4 items per section
            bullet_text = f"• {item}"
            story.append(Paragraph(bullet_text, styles['Body']))
        
        story.append(Spacer(1, 8))
    
    create_advice_section("Diet & Nutrition", "🥗", diet_advice, SECONDARY_COLOR)
    create_advice_section("Exercise & Activity", "🏃", exercise_advice, PRIMARY_COLOR)
    create_advice_section("Sleep & Recovery", "😴", sleep_advice, PRIMARY_LIGHT)
    create_advice_section("Medical Follow-ups", "🏥", medical_advice, WARNING_COLOR)
    
    if other_advice:
        create_advice_section("Additional Recommendations", "💡", other_advice, TEXT_COLOR)
    
    story.append(Spacer(1, 30))
    
    # ========================================
    # FOOTER & DISCLAIMER
    # ========================================
    
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=20, spaceAfter=12))
    
    disclaimer_text = """
    <b>MEDICAL DISCLAIMER</b><br/><br/>
    This report is generated by Earlyrisk AI and is intended for informational purposes only. 
    It is not a substitute for professional medical advice, diagnosis, or treatment. 
    Always seek the advice of your physician or other qualified health provider with any 
    questions you may have regarding a medical condition. Never disregard professional 
    medical advice or delay in seeking it because of information contained in this report.<br/><br/>
    
    The risk scores and recommendations are based on AI analysis of the provided health data 
    and established medical guidelines. Individual results may vary. This report should be 
    reviewed in conjunction with a healthcare professional who can consider your complete 
    medical history and circumstances.
    """
    
    story.append(Paragraph(disclaimer_text, styles['Disclaimer']))
    story.append(Spacer(1, 15))
    
    # Footer with generation info
    footer_text = f"""
    Generated by Earlyrisk AI | Report Date: {report_date.strftime("%Y-%m-%d %H:%M UTC")}<br/>
    © 2024 Earlyrisk AI. All rights reserved. | www.earlyrisk.ai
    """
    story.append(Paragraph(footer_text, styles['Footer']))
    
    # Build PDF
    doc.build(story)
    
    return buffer.getvalue()


def generate_report_filename(patient_name: str, report_date: Optional[datetime] = None) -> str:
    """Generate a standardized filename for the report."""
    if report_date is None:
        report_date = datetime.utcnow()
    
    # Sanitize patient name for filename
    safe_name = "".join(c if c.isalnum() else "_" for c in patient_name)
    date_str = report_date.strftime("%Y%m%d")
    
    return f"EarlyriskAI_Health_Report_{safe_name}_{date_str}.pdf"
