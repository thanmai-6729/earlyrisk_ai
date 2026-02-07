import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import PrivateLayout from '../components/PrivateLayout.jsx';
import { getPatientLatest } from '../api.js';

function generatePlans(analysis, inputData) {
  const plans = [];
  
  // Calculate risk factors
  const sleepHours = Number(inputData?.sleep_hours) || 7;
  const exercise = Number(inputData?.exercise_mins_per_week) || 120;
  const stress = Number(inputData?.stress_level) || 5;
  const cholesterol = Number(inputData?.cholesterol_mgdl) || 180;
  const sugar = Number(inputData?.sugar_mgdl) || 100;
  const bpSystolic = Number(inputData?.bp_systolic) || 120;
  
  const height = Number(inputData?.height_cm) || 170;
  const weight = Number(inputData?.weight_kg) || 70;
  const bmi = height > 0 ? weight / ((height / 100) ** 2) : 24;
  
  const diabetesRisk = Number(analysis?.diabetesRisk) || 0;
  const heartRisk = Number(analysis?.heartRisk) || 0;
  const depressionRisk = Number(analysis?.depressionRisk) || 0;
  
  // Sleep Plan - emphasized if sleep is poor or depression risk is high
  const sleepPriority = sleepHours < 6 || depressionRisk > 40 ? 'high' : sleepHours < 7 ? 'medium' : 'low';
  plans.push({
    id: 'sleep',
    title: 'Sleep Optimization Plan',
    icon: 'bedtime',
    priority: sleepPriority,
    color: sleepPriority === 'high' ? 'purple' : 'blue',
    summary: sleepHours < 6 
      ? 'Critical: Your sleep duration needs immediate improvement'
      : sleepHours < 7
      ? 'Your sleep could use some optimization'
      : 'Your sleep is within healthy range - maintain these habits',
    currentStatus: `${sleepHours} hours/night average`,
    targetStatus: '7-9 hours/night',
    recommendations: [
      {
        title: 'Consistent Sleep Schedule',
        description: 'Go to bed and wake up at the same time every day, even on weekends.',
        impact: sleepHours < 6 ? 'Could improve sleep quality by 30%' : 'Maintains circadian rhythm',
      },
      {
        title: 'Screen-Free Hour Before Bed',
        description: 'Avoid phones, tablets, and computers 1 hour before sleep to reduce blue light exposure.',
        impact: 'Increases melatonin production',
      },
      {
        title: 'Optimize Sleep Environment',
        description: 'Keep bedroom cool (65-68°F), dark, and quiet. Consider blackout curtains.',
        impact: 'Improves deep sleep duration',
      },
      {
        title: 'Limit Caffeine After 2 PM',
        description: 'Caffeine has a half-life of 5-6 hours and can significantly disrupt sleep.',
        impact: 'Reduces sleep latency by 20 mins',
      },
    ],
    weeklyGoals: [
      'Track sleep for 7 days using a sleep diary or app',
      'Set a consistent bedtime alarm',
      'Create a 30-minute wind-down routine',
    ],
  });
  
  // Diet Plan - emphasized if cholesterol/sugar/BMI are concerning
  const dietPriority = cholesterol > 200 || sugar > 125 || bmi > 28 || diabetesRisk > 50 ? 'high' : 'medium';
  plans.push({
    id: 'diet',
    title: 'Nutrition & Diet Plan',
    icon: 'restaurant',
    priority: dietPriority,
    color: dietPriority === 'high' ? 'red' : 'green',
    summary: dietPriority === 'high'
      ? 'Your metabolic markers suggest dietary changes are important'
      : 'Maintaining a balanced diet will help sustain your health',
    currentStatus: `Cholesterol: ${cholesterol} mg/dL, BMI: ${bmi.toFixed(1)}`,
    targetStatus: 'Cholesterol < 200, BMI 18.5-24.9',
    recommendations: [
      {
        title: 'Mediterranean Diet Approach',
        description: 'Focus on whole grains, lean proteins, healthy fats (olive oil, nuts), and abundant vegetables.',
        impact: 'Can reduce heart disease risk by 30%',
      },
      {
        title: 'Reduce Processed Foods',
        description: 'Minimize intake of processed meats, sugary drinks, and packaged snacks.',
        impact: cholesterol > 200 ? 'Could lower cholesterol by 10-15%' : 'Maintains healthy cholesterol',
      },
      {
        title: 'Increase Fiber Intake',
        description: 'Aim for 25-30g daily from oats, beans, fruits, and vegetables.',
        impact: 'Improves blood sugar control',
      },
      {
        title: 'Portion Control',
        description: 'Use smaller plates and practice mindful eating to manage calorie intake.',
        impact: bmi > 25 ? 'Supports healthy weight loss' : 'Maintains healthy weight',
      },
    ],
    weeklyGoals: [
      'Prepare 4+ home-cooked meals this week',
      'Add one extra serving of vegetables daily',
      'Replace one sugary drink with water daily',
    ],
  });
  
  // Exercise Plan - emphasized if exercise is low or heart risk is high
  const exercisePriority = exercise < 90 || heartRisk > 50 ? 'high' : exercise < 150 ? 'medium' : 'low';
  plans.push({
    id: 'exercise',
    title: 'Physical Activity Plan',
    icon: 'fitness_center',
    priority: exercisePriority,
    color: exercisePriority === 'high' ? 'orange' : 'teal',
    summary: exercise < 90
      ? 'Increasing physical activity is crucial for your health'
      : exercise < 150
      ? 'You\'re on the right track - let\'s optimize your routine'
      : 'Excellent activity level - focus on variety and consistency',
    currentStatus: `${exercise} minutes/week`,
    targetStatus: '150+ minutes moderate activity/week',
    recommendations: [
      {
        title: 'Start with Walking',
        description: 'Begin with 15-20 minute walks daily. Gradually increase duration and pace.',
        impact: 'Burns 100-150 calories per walk',
      },
      {
        title: 'Add Resistance Training',
        description: 'Include 2 sessions of strength exercises per week to build muscle and boost metabolism.',
        impact: 'Increases resting metabolic rate by 7%',
      },
      {
        title: 'Take Movement Breaks',
        description: 'Every hour, take a 5-minute movement break if you have a sedentary job.',
        impact: 'Reduces sitting time health risks',
      },
      {
        title: 'Find Enjoyable Activities',
        description: 'Try different activities like swimming, cycling, dancing, or sports to stay motivated.',
        impact: 'Improves long-term adherence',
      },
    ],
    weeklyGoals: [
      `Achieve ${Math.min(exercise + 30, 150)} minutes of activity this week`,
      'Try one new physical activity',
      'Track daily steps and aim for 8,000+',
    ],
  });
  
  // Stress Management Plan - emphasized if stress is high
  const stressPriority = stress >= 7 || depressionRisk > 40 ? 'high' : stress >= 5 ? 'medium' : 'low';
  plans.push({
    id: 'stress',
    title: 'Stress Management Plan',
    icon: 'self_improvement',
    priority: stressPriority,
    color: stressPriority === 'high' ? 'pink' : 'indigo',
    summary: stress >= 7
      ? 'Your stress levels need attention for overall wellbeing'
      : stress >= 5
      ? 'Moderate stress - preventive measures recommended'
      : 'Good stress management - maintain your current practices',
    currentStatus: `Stress level: ${stress}/10`,
    targetStatus: 'Stress level < 4/10',
    recommendations: [
      {
        title: 'Daily Mindfulness Practice',
        description: 'Start with 5-10 minutes of meditation or deep breathing exercises daily.',
        impact: 'Reduces cortisol by up to 25%',
      },
      {
        title: 'Set Work Boundaries',
        description: 'Establish clear work hours and disconnect from work communications after hours.',
        impact: 'Prevents burnout',
      },
      {
        title: 'Social Connection',
        description: 'Schedule regular time with friends and family. Social support is vital for mental health.',
        impact: 'Improves emotional resilience',
      },
      {
        title: 'Nature Time',
        description: 'Spend at least 20 minutes in nature daily - parks, gardens, or outdoor walks.',
        impact: 'Reduces anxiety and depression',
      },
    ],
    weeklyGoals: [
      'Practice deep breathing for 5 minutes daily',
      'Schedule 2 social activities this week',
      'Identify top 3 stress triggers and one coping strategy for each',
    ],
  });
  
  // Medical Follow-ups Plan
  const medicalPriority = heartRisk > 60 || diabetesRisk > 60 || bpSystolic > 140 ? 'high' : 'medium';
  plans.push({
    id: 'medical',
    title: 'Medical Follow-ups',
    icon: 'medical_services',
    priority: medicalPriority,
    color: medicalPriority === 'high' ? 'red' : 'blue',
    summary: medicalPriority === 'high'
      ? 'Based on your risk factors, medical consultation is recommended'
      : 'Regular check-ups will help monitor your health progress',
    currentStatus: 'Latest analysis completed',
    targetStatus: 'Regular monitoring every 3-6 months',
    recommendations: [
      {
        title: 'Schedule Primary Care Visit',
        description: diabetesRisk > 50 || heartRisk > 50
          ? 'Discuss your elevated risk factors with your doctor soon.'
          : 'Annual check-up recommended to monitor health markers.',
        impact: 'Early intervention if needed',
      },
      {
        title: 'Blood Work Panel',
        description: 'Request comprehensive metabolic panel including HbA1c, lipid profile, and liver function.',
        impact: 'Provides baseline for tracking',
      },
      {
        title: 'Blood Pressure Monitoring',
        description: bpSystolic > 130 
          ? 'Monitor blood pressure weekly and log results.'
          : 'Check blood pressure monthly.',
        impact: 'Catches hypertension early',
      },
      {
        title: 'Mental Health Check-in',
        description: depressionRisk > 30
          ? 'Consider speaking with a mental health professional.'
          : 'Stay aware of mood changes and stress levels.',
        impact: 'Supports overall wellbeing',
      },
    ],
    weeklyGoals: [
      'Schedule a doctor appointment if overdue',
      'Organize and review your health records',
      'Set reminders for any prescribed medications',
    ],
  });
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  plans.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return plans;
}

function getPriorityStyle(priority) {
  switch (priority) {
    case 'high':
      return { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' };
    case 'medium':
      return { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
    default:
      return { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' };
  }
}

function getColorClasses(color) {
  const colors = {
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', header: 'bg-purple-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', header: 'bg-blue-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', header: 'bg-red-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', header: 'bg-green-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', header: 'bg-orange-100' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600', header: 'bg-teal-100' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600', header: 'bg-pink-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', header: 'bg-indigo-100' },
  };
  return colors[color] || colors.blue;
}

export default function PersonalizedPlan() {
  const navigate = useNavigate();
  const { analysisId } = useParams();
  const { user, displayName } = useAuth();
  const userId = user?.id;

  const [analysis, setAnalysis] = useState(null);
  const [inputData, setInputData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!userId) return;

    let alive = true;

    async function fetchData() {
      setLoading(true);
      try {
        const data = await getPatientLatest(userId);
        if (!alive) return;

        if (data?.analysis) {
          setAnalysis(data.analysis);
        }
        if (data?.latest) {
          setInputData(data.latest);
        }
      } catch {
        // Failed to fetch
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchData();

    return () => {
      alive = false;
    };
  }, [userId]);

  const plans = useMemo(() => generatePlans(analysis, inputData), [analysis, inputData]);
  
  // Auto-expand first high-priority plan
  useEffect(() => {
    if (plans.length > 0 && expandedPlan === null) {
      const highPriority = plans.find(p => p.priority === 'high');
      setExpandedPlan(highPriority?.id || plans[0].id);
    }
  }, [plans, expandedPlan]);

  if (loading) {
    return (
      <PrivateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500">Generating your personalized plan…</p>
          </div>
        </div>
      </PrivateLayout>
    );
  }

  return (
    <PrivateLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => navigate('/app')} className="hover:text-primary">
            Dashboard
          </button>
          <span>›</span>
          <button onClick={() => navigate(`/analysis/${analysisId || 'latest'}`)} className="hover:text-primary">
            Analysis
          </button>
          <span>›</span>
          <span className="text-slate-800">Personalized Plan</span>
        </div>
        <button
          onClick={() => navigate('/app')}
          className="text-sm text-slate-500 hover:text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Dashboard
        </button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">assignment</span>
          Your Personalized Health Plan
        </h1>
        <p className="text-slate-500 mt-1">
          Hi {displayName}, based on your health analysis, we've created a customized improvement plan for you.
        </p>
      </div>

      {/* Priority Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {['high', 'medium', 'low'].map((priority) => {
          const count = plans.filter(p => p.priority === priority).length;
          const style = getPriorityStyle(priority);
          return (
            <div key={priority} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${style.dot}`} />
              <div>
                <span className="text-2xl font-bold text-slate-800">{count}</span>
                <span className="text-sm text-slate-500 ml-2">
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plans */}
      <div className="space-y-6">
        {plans.map((plan) => {
          const priorityStyle = getPriorityStyle(plan.priority);
          const colorClasses = getColorClasses(plan.color);
          const isExpanded = expandedPlan === plan.id;
          
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border ${colorClasses.border} shadow-sm overflow-hidden transition-all`}
            >
              {/* Plan Header */}
              <button
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                className={`w-full p-6 ${colorClasses.header} flex items-center justify-between text-left`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${colorClasses.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-2xl ${colorClasses.icon}`}>
                      {plan.icon}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-slate-800">{plan.title}</h2>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityStyle.badge}`}>
                        {plan.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{plan.summary}</p>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-2xl text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {/* Expanded Content with Animation */}
              <div 
                className={`grid transition-all duration-300 ease-in-out ${
                  isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="p-6 border-t border-slate-100">
                  {/* Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Status</span>
                      <p className="text-slate-800 font-medium mt-1">{plan.currentStatus}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Target</span>
                      <p className="text-green-800 font-medium mt-1">{plan.targetStatus}</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">tips_and_updates</span>
                    Recommendations
                  </h3>
                  <div className="space-y-4 mb-6">
                    {plan.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800">{rec.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                          <p className="text-xs text-primary mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            {rec.impact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weekly Goals */}
                  <div className={`${colorClasses.bg} rounded-xl p-4`}>
                    <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">flag</span>
                      This Week's Goals
                    </h4>
                    <ul className="space-y-2">
                      {plan.weeklyGoals.map((goal, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="material-symbols-outlined text-lg text-slate-400 flex-shrink-0">
                            check_box_outline_blank
                          </span>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Ready to start your health journey?</h3>
            <p className="text-white/80 text-sm">Track your progress and see improvements over time.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/app')}
              className="px-5 py-2.5 bg-white text-primary font-medium rounded-xl hover:bg-white/90 transition-colors"
            >
              Update Health Data
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="px-5 py-2.5 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}
