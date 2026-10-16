import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Trash2,
  Save,
  RotateCcw,
  Sliders,
  Moon,
  Sun,
  Lock,
  AlertTriangle,
  User,
  Building,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/Toast.tsx';
import { DEFAULT_SCORING_CONFIG, ScoringWeights, validateWeights } from '../utils/scoring.ts';
import { wipeAllData } from '../utils/dataStore.ts';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, theme, setTheme } = useAuth();
  const { toast } = useToast();

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [company, setCompany] = useState(user?.company || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Scoring Weights
  const [weights, setWeights] = useState<ScoringWeights>(() => {
    const saved = localStorage.getItem('resumeiq_weights');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { ...DEFAULT_SCORING_CONFIG.weights };
  });

  // Thresholds
  const [strongMin, setStrongMin] = useState<number>(75);
  const [partialMin, setPartialMin] = useState<number>(50);

  // Data Retention
  const [retentionDays, setRetentionDays] = useState<number>(90);

  // Danger zone typed confirmation
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wipingData, setWipingData] = useState(false);

  const weightValidation = validateWeights(weights);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(displayName, company);
      toast('Profile updated successfully', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveScoringWeights = () => {
    if (!weightValidation.valid) {
      toast(`Weights must sum exactly to 100% (currently ${weightValidation.total}%).`, 'error');
      return;
    }
    localStorage.setItem('resumeiq_weights', JSON.stringify(weights));
    toast('Scoring weights and thresholds saved!', 'success');
  };

  const handleResetWeights = () => {
    setWeights({ ...DEFAULT_SCORING_CONFIG.weights });
    setStrongMin(75);
    setPartialMin(50);
    localStorage.removeItem('resumeiq_weights');
    toast('Scoring weights reset to defaults.', 'info');
  };

  // Delete ALL recruiter data with typed confirmation
  const handleDeleteAllData = async () => {
    if (!user) return;
    if (wipeConfirmText !== 'DELETE MY DATA') {
      toast('Please type "DELETE MY DATA" exactly to confirm.', 'error');
      return;
    }

    setWipingData(true);
    try {
      await wipeAllData(user.uid);
      setWipeConfirmText('');
      toast('All jobs, resumes, candidate profiles, and screening results have been deleted.', 'success');
    } catch (err: any) {
      console.error('Data wipe error:', err);
      toast(err.message || 'Failed to delete all data', 'error');
    } finally {
      setWipingData(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Recruiter Profile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <span>Recruiter Profile</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Manage your account profile and organization branding.
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Account Email
            </label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Recruiter Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Company / Department
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>
      </div>

      {/* Deterministic Scoring Weights & Thresholds Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Scoring Weight Configuration</span>
            </h3>
            <p className="text-xs text-slate-500">
              Weights must total exactly 100%. Deterministic scoring runs with this configuration for reproducible rankings.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetWeights}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to defaults</span>
          </button>
        </div>

        <div className="space-y-4 max-w-xl text-xs">
          {/* Sliders */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Required Skill Coverage (Critical skills 2x):</span>
                <span className="font-bold">{weights.requiredSkills}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={70}
                value={weights.requiredSkills}
                onChange={e => setWeights({ ...weights, requiredSkills: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Relevant Experience (Years & roles):</span>
                <span className="font-bold">{weights.experience}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={weights.experience}
                onChange={e => setWeights({ ...weights, experience: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Education / Qualifications:</span>
                <span className="font-bold">{weights.education}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={weights.education}
                onChange={e => setWeights({ ...weights, education: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Preferred Skills & Certifications:</span>
                <span className="font-bold">{weights.preferredSkills}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={40}
                value={weights.preferredSkills}
                onChange={e => setWeights({ ...weights, preferredSkills: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>Projects and Documented Evidence:</span>
                <span className="font-bold">{weights.projects}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={weights.projects}
                onChange={e => setWeights({ ...weights, projects: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium mb-1">
                <span>TF-IDF Lexical Cosine Similarity:</span>
                <span className="font-bold">{weights.tfidfSimilarity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={weights.tfidfSimilarity}
                onChange={e => setWeights({ ...weights, tfidfSimilarity: parseInt(e.target.value, 10) })}
                className="w-full accent-blue-700"
              />
            </div>
          </div>

          {/* Validation Total Alert */}
          <div className={`p-3 rounded border text-xs flex items-center justify-between font-medium ${
            weightValidation.valid
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300'
          }`}>
            <span>Total Weight Allocation:</span>
            <span className="font-bold text-sm">{weightValidation.total}% {weightValidation.valid ? '✓ (Valid)' : '✕ (Must be 100%)'}</span>
          </div>

          <button
            type="button"
            onClick={handleSaveScoringWeights}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Scoring Weights</span>
          </button>
        </div>
      </div>

      {/* Privacy & Responsible AI Notice */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <span>Privacy & Responsible AI Architecture</span>
        </h3>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            <strong>What data is sent to the Gemini API:</strong> When you upload a resume or request requirement extraction, the sanitized text of the document is sent over secure TLS to Gemini strictly for entity extraction and factual grounded summarization.
          </p>
          <p>
            <strong>Protected Demographic Exclusion:</strong> ResumeIQ extraction prompts explicitly instruct the AI never to parse, record, or infer protected demographic attributes: date of birth, age, race, gender, marital status, nationality, religion, or medical details.
          </p>
          <p>
            <strong>Deterministic Math Guarantee:</strong> Candidate scores are calculated entirely by our server-side deterministic mathematical engine. Gemini never produces, adjusts, or influences numeric rankings.
          </p>
        </div>
      </div>

      {/* Danger Zone: Data Wipe Controls */}
      <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded p-6 space-y-4">
        <h3 className="text-base font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone: Recruiter Data Controls</span>
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
          Permanently delete all your jobs, uploaded resumes, extracted candidate profiles, and screening session history. This action cannot be undone.
        </p>

        <div className="space-y-3 max-w-md text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Type <strong>DELETE MY DATA</strong> to confirm:
            </label>
            <input
              type="text"
              value={wipeConfirmText}
              onChange={e => setWipeConfirmText(e.target.value)}
              placeholder="DELETE MY DATA"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-800 rounded text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            disabled={wipeConfirmText !== 'DELETE MY DATA' || wipingData}
            onClick={handleDeleteAllData}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{wipingData ? 'Deleting All Records...' : 'Permanently Delete All My Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
