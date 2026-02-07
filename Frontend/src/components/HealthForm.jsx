import { useCallback, useMemo, useState } from 'react';

const defaultValues = {
  age: 30,
  gender: 'male',
  height_cm: 170,
  weight_kg: 70,
  bp_systolic: 120,
  bp_diastolic: 80,
  sugar_mgdl: 95,
  hba1c_pct: 5.2,
  cholesterol_mgdl: 180,
  sleep_hours: 7,
  exercise_mins_per_week: 120,
  stress_level: 4,
  family_history: 0,
};

export default function HealthForm({
  initialValues,
  onSubmit,
  submitLabel = 'Analyze Health',
  disabled = false,
  loading = false,
  statusMessage = '',
}) {
  const init = useMemo(() => ({ ...defaultValues, ...(initialValues || {}) }), [initialValues]);
  const [values, setValues] = useState(init);

  const setField = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
  }, []);

  const onNumberChange = useCallback(
    (name) => (e) => {
      const raw = e.target.value;
      const n = raw === '' ? '' : Number(raw);
      setField(name, n);
    },
    [setField]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (disabled || loading) return;

      const payload = {
        ...values,
        age: Number(values.age),
        height_cm: Number(values.height_cm),
        weight_kg: Number(values.weight_kg),
        bp_systolic: Number(values.bp_systolic),
        bp_diastolic: Number(values.bp_diastolic),
        sugar_mgdl: Number(values.sugar_mgdl),
        hba1c_pct: Number(values.hba1c_pct),
        cholesterol_mgdl: Number(values.cholesterol_mgdl),
        sleep_hours: Number(values.sleep_hours),
        exercise_mins_per_week: Number(values.exercise_mins_per_week),
        stress_level: Number(values.stress_level),
        family_history: Number(values.family_history),
        gender: String(values.gender || 'other'),
      };

      await onSubmit?.(payload);
    },
    [values, disabled, loading, onSubmit]
  );

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Demographics */}
        <div>
          <label className={labelClass}>Age</label>
          <input
            type="number"
            min={0}
            max={120}
            value={values.age}
            onChange={onNumberChange('age')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Gender</label>
          <select
            value={values.gender}
            onChange={(e) => setField('gender', e.target.value)}
            className={inputClass}
            disabled={disabled || loading}
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Family History</label>
          <select
            value={values.family_history}
            onChange={(e) => setField('family_history', Number(e.target.value))}
            className={inputClass}
            disabled={disabled || loading}
            required
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </div>

        {/* Body Metrics */}
        <div>
          <label className={labelClass}>Height (cm)</label>
          <input
            type="number"
            min={50}
            max={250}
            value={values.height_cm}
            onChange={onNumberChange('height_cm')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Weight (kg)</label>
          <input
            type="number"
            min={10}
            max={300}
            step={0.1}
            value={values.weight_kg}
            onChange={onNumberChange('weight_kg')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        {/* Blood Pressure */}
        <div>
          <label className={labelClass}>BP Systolic</label>
          <input
            type="number"
            min={50}
            max={250}
            value={values.bp_systolic}
            onChange={onNumberChange('bp_systolic')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>BP Diastolic</label>
          <input
            type="number"
            min={30}
            max={160}
            value={values.bp_diastolic}
            onChange={onNumberChange('bp_diastolic')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        {/* Lab Values */}
        <div>
          <label className={labelClass}>Sugar (mg/dL)</label>
          <input
            type="number"
            min={40}
            max={400}
            value={values.sugar_mgdl}
            onChange={onNumberChange('sugar_mgdl')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>HbA1c (%)</label>
          <input
            type="number"
            min={2}
            max={20}
            step={0.1}
            value={values.hba1c_pct}
            onChange={onNumberChange('hba1c_pct')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Cholesterol (mg/dL)</label>
          <input
            type="number"
            min={60}
            max={500}
            value={values.cholesterol_mgdl}
            onChange={onNumberChange('cholesterol_mgdl')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        {/* Lifestyle */}
        <div>
          <label className={labelClass}>Sleep (hrs/day)</label>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={values.sleep_hours}
            onChange={onNumberChange('sleep_hours')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Exercise (min/week)</label>
          <input
            type="number"
            min={0}
            max={2000}
            value={values.exercise_mins_per_week}
            onChange={onNumberChange('exercise_mins_per_week')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Stress Level (0-10)</label>
          <input
            type="number"
            min={0}
            max={10}
            value={values.stress_level}
            onChange={onNumberChange('stress_level')}
            className={inputClass}
            disabled={disabled || loading}
            required
          />
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="text-sm text-slate-600 dark:text-slate-400">{statusMessage}</div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={disabled || loading}
          className="px-6 py-3 rounded-lg font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
