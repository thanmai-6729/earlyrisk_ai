import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import styles from './ReportPage.module.css';

const ReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reportRef = useRef(null);
  
  // Get data from navigation state or localStorage
  const [reportData, setReportData] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    reportDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    reportId: `ER-${Date.now().toString(36).toUpperCase()}`
  });

  useEffect(() => {
    // Try to get data from navigation state first
    if (location.state?.analysisData) {
      setReportData(location.state.analysisData);
      if (location.state.patientInfo) {
        setPatientInfo(prev => ({ ...prev, ...location.state.patientInfo }));
      }
    } else {
      // Fallback to localStorage
      const savedData = localStorage.getItem('latestAnalysis');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setReportData(parsed);
        } catch (e) {
          console.error('Failed to parse saved analysis:', e);
        }
      }
    }

    // Get user info
    if (user) {
      setPatientInfo(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Patient',
        email: user.email || ''
      }));
    }
  }, [location.state, user]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getRiskColor = (risk) => {
    if (risk >= 70) return '#dc2626';
    if (risk >= 40) return '#f59e0b';
    return '#22c55e';
  };

  const getRiskLevel = (risk) => {
    if (risk >= 70) return 'High';
    if (risk >= 40) return 'Moderate';
    return 'Low';
  };

  if (!reportData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <h2>Loading Report Data...</h2>
          <p>If data doesn't load, please run a health analysis first.</p>
          <button onClick={() => navigate('/dashboard')} className={styles.backBtn}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { risks = {}, advice = [], contributors = [] } = reportData;

  // Map data - handle both formats (risks.diabetes or diabetesRisk)
  const diabetesRisk = risks.diabetes || reportData.diabetesRisk || 0;
  const heartRisk = risks.heart || reportData.heartRisk || 0;
  const hypertensionRisk = risks.hypertension || reportData.hypertensionRisk || 0;
  const liverRisk = risks.liver || reportData.liverRisk || 0;
  const depressionRisk = risks.depression || reportData.depressionRisk || 0;
  
  // Get advice from various possible locations
  const adviceList = advice.length > 0 ? advice : (reportData.advice || []);

  return (
    <div className={styles.pageWrapper}>
      {/* Print Controls - Hidden when printing */}
      <div className={styles.controls}>
        <button onClick={handleBack} className={styles.backBtn}>
          ← Back
        </button>
        <button onClick={handlePrint} className={styles.printBtn}>
          📄 Download / Print PDF
        </button>
      </div>

      {/* Report Content */}
      <div className={styles.reportContainer} ref={reportRef}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>❤️</div>
            <div className={styles.logoText}>
              <h1>EarlyRisk AI</h1>
              <span>Predictive Health Intelligence</span>
            </div>
          </div>
          <div className={styles.reportMeta}>
            <p><strong>Report ID:</strong> {patientInfo.reportId}</p>
            <p><strong>Generated:</strong> {patientInfo.reportDate}</p>
          </div>
        </header>

        {/* Title */}
        <div className={styles.titleSection}>
          <h2>Comprehensive Health Risk Assessment Report</h2>
          <p className={styles.confidential}>CONFIDENTIAL - FOR PATIENT USE ONLY</p>
        </div>

        {/* Patient Information */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>👤</span>
            Patient Information
          </h3>
          <div className={styles.patientGrid}>
            <div className={styles.infoItem}>
              <label>Full Name</label>
              <span>{patientInfo.name}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Email</label>
              <span>{patientInfo.email || 'Not provided'}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Report Date</label>
              <span>{patientInfo.reportDate}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Assessment Type</label>
              <span>AI-Powered Risk Analysis</span>
            </div>
          </div>
        </section>

        {/* Overall Health Summary */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📊</span>
            Health Risk Summary
          </h3>
          <div className={styles.summaryCard}>
            <div className={styles.overallScore}>
              <div 
                className={styles.scoreCircle}
                style={{ 
                  borderColor: getRiskColor(
                    Math.max(diabetesRisk, heartRisk, hypertensionRisk)
                  )
                }}
              >
                <span className={styles.scoreValue}>
                  {Math.round(100 - (diabetesRisk + heartRisk + hypertensionRisk) / 3)}%
                </span>
                <span className={styles.scoreLabel}>Health Score</span>
              </div>
            </div>
            <div className={styles.summaryText}>
              <p>
                Based on the AI analysis of your health metrics, your overall health score is calculated 
                considering multiple risk factors. This assessment provides insights into potential 
                health risks and personalized recommendations for improvement.
              </p>
            </div>
          </div>
        </section>

        {/* Risk Comparison Chart */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📈</span>
            Risk Comparison Chart
          </h3>
          <div className={styles.chartContainer}>
            <div className={styles.barChart}>
              {/* Diabetes Bar */}
              <div className={styles.chartRow}>
                <div className={styles.chartLabel}>🩸 Diabetes</div>
                <div className={styles.chartBarWrapper}>
                  <div 
                    className={styles.chartBar}
                    style={{ 
                      width: `${Math.min(diabetesRisk, 100)}%`,
                      backgroundColor: getRiskColor(diabetesRisk)
                    }}
                  >
                    <span className={styles.chartValue}>{diabetesRisk.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              {/* Heart Bar */}
              <div className={styles.chartRow}>
                <div className={styles.chartLabel}>❤️ Heart Disease</div>
                <div className={styles.chartBarWrapper}>
                  <div 
                    className={styles.chartBar}
                    style={{ 
                      width: `${Math.min(heartRisk, 100)}%`,
                      backgroundColor: getRiskColor(heartRisk)
                    }}
                  >
                    <span className={styles.chartValue}>{heartRisk.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              {/* Hypertension Bar */}
              <div className={styles.chartRow}>
                <div className={styles.chartLabel}>💓 Hypertension</div>
                <div className={styles.chartBarWrapper}>
                  <div 
                    className={styles.chartBar}
                    style={{ 
                      width: `${Math.min(hypertensionRisk, 100)}%`,
                      backgroundColor: getRiskColor(hypertensionRisk)
                    }}
                  >
                    <span className={styles.chartValue}>{hypertensionRisk.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              {/* Liver Bar */}
              {liverRisk > 0 && (
                <div className={styles.chartRow}>
                  <div className={styles.chartLabel}>🫁 Liver Risk</div>
                  <div className={styles.chartBarWrapper}>
                    <div 
                      className={styles.chartBar}
                      style={{ 
                        width: `${Math.min(liverRisk, 100)}%`,
                        backgroundColor: getRiskColor(liverRisk)
                      }}
                    >
                      <span className={styles.chartValue}>{liverRisk.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Depression Bar */}
              {depressionRisk > 0 && (
                <div className={styles.chartRow}>
                  <div className={styles.chartLabel}>🧠 Mental Health</div>
                  <div className={styles.chartBarWrapper}>
                    <div 
                      className={styles.chartBar}
                      style={{ 
                        width: `${Math.min(depressionRisk, 100)}%`,
                        backgroundColor: getRiskColor(depressionRisk)
                      }}
                    >
                      <span className={styles.chartValue}>{depressionRisk.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Risk Level Legend */}
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ backgroundColor: '#22c55e' }}></span>
                <span>Low Risk (0-39%)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }}></span>
                <span>Moderate Risk (40-69%)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ backgroundColor: '#dc2626' }}></span>
                <span>High Risk (70-100%)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Disease Risk Analysis */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>⚠️</span>
            Disease Risk Analysis
          </h3>
          <div className={styles.riskGrid}>
            {/* Diabetes Risk */}
            <div className={styles.riskCard}>
              <div className={styles.riskHeader}>
                <span className={styles.riskEmoji}>🩸</span>
                <h4>Diabetes Risk</h4>
              </div>
              <div className={styles.riskBarContainer}>
                <div 
                  className={styles.riskBar}
                  style={{ 
                    width: `${diabetesRisk}%`,
                    backgroundColor: getRiskColor(diabetesRisk)
                  }}
                ></div>
              </div>
              <div className={styles.riskStats}>
                <span 
                  className={styles.riskPercent}
                  style={{ color: getRiskColor(diabetesRisk) }}
                >
                  {diabetesRisk.toFixed(1)}%
                </span>
                <span 
                  className={styles.riskLevel}
                  style={{ backgroundColor: getRiskColor(diabetesRisk) }}
                >
                  {getRiskLevel(diabetesRisk)} Risk
                </span>
              </div>
            </div>

            {/* Heart Disease Risk */}
            <div className={styles.riskCard}>
              <div className={styles.riskHeader}>
                <span className={styles.riskEmoji}>❤️</span>
                <h4>Heart Disease Risk</h4>
              </div>
              <div className={styles.riskBarContainer}>
                <div 
                  className={styles.riskBar}
                  style={{ 
                    width: `${heartRisk}%`,
                    backgroundColor: getRiskColor(heartRisk)
                  }}
                ></div>
              </div>
              <div className={styles.riskStats}>
                <span 
                  className={styles.riskPercent}
                  style={{ color: getRiskColor(heartRisk) }}
                >
                  {heartRisk.toFixed(1)}%
                </span>
                <span 
                  className={styles.riskLevel}
                  style={{ backgroundColor: getRiskColor(heartRisk) }}
                >
                  {getRiskLevel(heartRisk)} Risk
                </span>
              </div>
            </div>

            {/* Hypertension Risk */}
            <div className={styles.riskCard}>
              <div className={styles.riskHeader}>
                <span className={styles.riskEmoji}>💓</span>
                <h4>Hypertension Risk</h4>
              </div>
              <div className={styles.riskBarContainer}>
                <div 
                  className={styles.riskBar}
                  style={{ 
                    width: `${hypertensionRisk}%`,
                    backgroundColor: getRiskColor(hypertensionRisk)
                  }}
                ></div>
              </div>
              <div className={styles.riskStats}>
                <span 
                  className={styles.riskPercent}
                  style={{ color: getRiskColor(hypertensionRisk) }}
                >
                  {hypertensionRisk.toFixed(1)}%
                </span>
                <span 
                  className={styles.riskLevel}
                  style={{ backgroundColor: getRiskColor(hypertensionRisk) }}
                >
                  {getRiskLevel(hypertensionRisk)} Risk
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Risk Contributors */}
        {contributors && contributors.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🔍</span>
              Key Risk Contributors
            </h3>
            <div className={styles.contributorsTable}>
              <table>
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Impact Level</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.slice(0, 5).map((contributor, index) => (
                    <tr key={index}>
                      <td className={styles.factorName}>
                        {typeof contributor === 'string' ? contributor : contributor.factor || contributor.name || `Factor ${index + 1}`}
                      </td>
                      <td>
                        <span className={styles.impactBadge} style={{
                          backgroundColor: index < 2 ? '#fee2e2' : index < 4 ? '#fef3c7' : '#dcfce7',
                          color: index < 2 ? '#dc2626' : index < 4 ? '#d97706' : '#16a34a'
                        }}>
                          {index < 2 ? 'High' : index < 4 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td className={styles.factorDesc}>
                        {typeof contributor === 'string' 
                          ? 'Contributing factor identified by AI analysis'
                          : contributor.description || 'Contributing factor identified by AI analysis'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Personalized Recommendations */}
        {adviceList && adviceList.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>💡</span>
              Personalized Health Recommendations
            </h3>
            <div className={styles.adviceList}>
              {adviceList.map((item, index) => (
                <div key={index} className={styles.adviceItem}>
                  <div className={styles.adviceNumber}>{index + 1}</div>
                  <div className={styles.adviceContent}>
                    <p>{typeof item === 'string' ? item : item.text || item.advice || item.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Medical Disclaimer */}
        <section className={styles.disclaimer}>
          <h4>⚕️ Important Medical Disclaimer</h4>
          <p>
            This report is generated by an AI-powered health risk assessment system and is intended 
            for informational purposes only. It does not constitute medical advice, diagnosis, or 
            treatment recommendations. The risk percentages are statistical predictions based on 
            the provided health data and should not replace professional medical evaluation.
          </p>
          <p>
            <strong>Please consult with a qualified healthcare provider</strong> before making any 
            health-related decisions or changes to your lifestyle, diet, or medication based on 
            this report.
          </p>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <span>❤️</span> EarlyRisk AI
            </div>
            <div className={styles.footerInfo}>
              <p>Powered by Advanced Machine Learning</p>
              <p>© 2024-2026 EarlyRisk AI - Predictive Health Intelligence</p>
            </div>
            <div className={styles.footerMeta}>
              <p>Report ID: {patientInfo.reportId}</p>
              <p>Generated: {patientInfo.reportDate}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ReportPage;
