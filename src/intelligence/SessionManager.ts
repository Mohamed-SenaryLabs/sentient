/**
 * Session Manager (Layer 2)
 * 
 * Generates concrete Sessions from abstract Directives.
 * Applies the "Active Lens" (Archetype) to flavor the workout.
 */

import { DailyDirective, Session, SessionOverride } from '../data/schema';

export class SessionManager {
  
  static generateSession(
      directive: DailyDirective['directive'], 
      lens: string, 
      focusRefinement?: string, // Legacy param, maps to focus_cue
      llmSession?: SessionOverride
  ): Session {
      const { category, stimulus_type } = directive;
  
      let title = "General Session";
      let subtitle = "Standard Protocol";
      let instructions = "Complete the prescribed activity.";
      // Defaults for Narrative Fields
      let session_focus = focusRefinement || `Execute strict ${stimulus_type} intent.`;
      let avoid_cue = "Avoid compromising form for intensity.";
      let analyst_insight = "";
      
      let intensity: 'LOW' | 'MODERATE' | 'HIGH' = 'MODERATE';
      let type: 'DURATION' | 'CALORIES' | 'HEART_RATE' | 'STEPS' = 'DURATION';
      let target = 30;

      // --- 1. RIGID FALLBACK (Default Logic) ---
      // Determine baseline properties first
      switch (stimulus_type) {
          case 'FLUSH':
              title = "Recovery Protocol"; intensity = 'LOW'; type = 'STEPS'; target = 5000;
              avoid_cue = "Avoid heart rate spikes above Zone 1.";
              break;
          case 'MAINTENANCE':
              title = "Maintenance Work"; intensity = 'MODERATE';
              avoid_cue = "Avoid accumulating excessive fatigue.";
              break;
          case 'OVERLOAD':
              title = "High Intensity Block"; intensity = 'HIGH';
              avoid_cue = "Avoid form breakdown under load.";
              break;
          case 'TEST':
              title = "Benchmark Assessment"; intensity = 'HIGH';
              avoid_cue = "Avoid pacing too conservatively.";
              break;
      }

      if (category === 'REGULATION') {
           title = "CNS Regulation"; subtitle = "Breathwork"; 
           instructions = "Focus on nasal breathing.";
           session_focus = "Downregulate the nervous system.";
           avoid_cue = "Avoid high stimulation environments.";
      }
      
      // Infer intensity from Category/Stimulus (Safety Guardrail)
      if (category === 'STRENGTH' || stimulus_type === 'OVERLOAD') intensity = 'HIGH';
      else if (category === 'REGULATION' || stimulus_type === 'FLUSH') intensity = 'LOW';
      else intensity = 'MODERATE';

      // --- 2. LLM OVERRIDE (Partial Merge) ---
      if (llmSession) {
          if (llmSession.title) title = llmSession.title;
          if (llmSession.subtitle) subtitle = llmSession.subtitle;
          if (llmSession.instructions) instructions = llmSession.instructions;
          if (llmSession.type) type = llmSession.type;
          if (llmSession.target_value) target = llmSession.target_value;

          if (llmSession.focus_cue) session_focus = llmSession.focus_cue;
          if (llmSession.avoid_cue) avoid_cue = llmSession.avoid_cue;
          if (llmSession.analyst_insight) analyst_insight = llmSession.analyst_insight;
      }


      // 3. Construct Session Object
      return {
          id: `sess_${Date.now()}`,
          status: 'PENDING',
          display: {
              title,
              subtitle,
              icon: category === 'STRENGTH' ? 'dumbbell' : category === 'ENDURANCE' ? 'run' : 'brain',
              color: intensity === 'HIGH' ? '#EF4444' : intensity === 'MODERATE' ? '#F59E0B' : '#10B981',
              label: `${category} // ${stimulus_type}`
          },
          instructions: instructions, 
          session_focus,
          avoid_cue,
          analyst_insight,
          validation: {
              type,
              target_value: target,
              min_hr: intensity === 'HIGH' ? 140 : null,
              max_hr: intensity === 'LOW' ? 120 : null,
          },
          impact: {
              primary_axis: category === 'STRENGTH' ? 'MECHANICAL' : category === 'REGULATION' ? 'RECOVERY' : 'METABOLIC',
              physiological_load: intensity === 'HIGH' ? 8 : intensity === 'MODERATE' ? 5 : 2
          },
          intensity,
          created_at: new Date().toISOString(),
          expires_at: new Date(new Date().setHours(23, 59, 59)).toISOString()
      };
  }
}
