/**
 * Session Manager (Layer 2)
 * 
 * Generates concrete Sessions from abstract Directives.
 * Applies the "Active Lens" (Archetype) to flavor the workout.
 */

import { DailyDirective, Session } from '../data/schema';

export class SessionManager {
  
  static generateSession(
      directive: DailyDirective['directive'], 
      lens: string, 
      focusRefinement?: string,
      llmSession?: {
          title: string;
          subtitle: string;
          instructions: string;
          type: 'DURATION' | 'CALORIES' | 'STEPS' | 'HEART_RATE';
          target_value: number;
      }
  ): Session {
      const { category, stimulus_type } = directive;
  
      let title = "General Session";
      let subtitle = "Standard Protocol";
      let instructions = "Complete the prescribed activity.";
      let intensity: 'LOW' | 'MODERATE' | 'HIGH' = 'MODERATE';
      let type: 'DURATION' | 'CALORIES' | 'HEART_RATE' | 'STEPS' = 'DURATION';
      let target = 30;

      // --- 1. LLM OVERRIDE (Dynamic) ---
      if (llmSession) {
          title = llmSession.title;
          subtitle = llmSession.subtitle;
          instructions = llmSession.instructions;
          type = llmSession.type;
          target = llmSession.target_value;
          
          // Infer intensity from Category/Stimulus (Safety Guardrail)
          if (category === 'STRENGTH' || stimulus_type === 'OVERLOAD') intensity = 'HIGH';
          else if (category === 'REGULATION' || stimulus_type === 'FLUSH') intensity = 'LOW';
          else intensity = 'MODERATE';
      } 
      // --- 2. RIGID FALLBACK (Static) ---
      else {
          // ... (Existing Switch Logic could remain here as fallback, but for brevity I'll keep the core structure)
          // 1. Determine Base Properties by Stimulus
          switch (stimulus_type) {
              case 'FLUSH':
                  title = "Recovery Protocol";
                  intensity = 'LOW';
                  type = 'STEPS'; 
                  target = 5000;
                  break;
              case 'MAINTENANCE':
                  title = "Maintenance Work";
                  intensity = 'MODERATE';
                  break;
              case 'OVERLOAD':
                  title = "High Intensity Block";
                  intensity = 'HIGH';
                  break;
              case 'TEST':
                  title = "Benchmark Assessment";
                  intensity = 'HIGH';
                  break;
          }

          // 2. Flavor by Category & Lens
           const archetype = lens.toUpperCase();

          if (category === 'STRENGTH') {
              type = 'CALORIES'; 
              target = 400;
              if (archetype === 'PALADIN' || archetype === 'HYBRID') {
                  subtitle = "Heavy Resistance";
                  instructions = "Focus on compound movements: Squat, Deadlift, Press. 5x5 Rep Scheme.";
              } else if (archetype === 'MONK' || archetype === 'RANGER') {
                  subtitle = "Functional Strength";
                  instructions = "Bodyweight calisthenics, weighted vest work, or kettlebells.";
              } else {
                  subtitle = "General Resistance";
                  instructions = "Full body resistance training.";
              }
          } 
          else if (category === 'ENDURANCE') {
              type = 'DURATION';
              target = 45; 
              if (archetype === 'RANGER') {
                  subtitle = "Ruck / Long Run";
                  instructions = "Maintain Zone 2 HR. Ruck with 35lb+ or Long Distance Run.";
                  target = 60;
              } else if (archetype === 'MONK') {
                  subtitle = "Flow / Run";
                  instructions = "Continuous movement. Running or sustained flow.";
              } else {
                  subtitle = "Cardiovascular Output";
                  instructions = "Steady state cardio (Zone 2).";
              }
          }
          else if (category === 'REGULATION') {
              type = 'DURATION';
              target = 20;
              title = "CNS Regulation";
              subtitle = "Breathwork / Mobility";
              instructions = "Focus on nasal breathing and parasympathetic activation.";
              intensity = 'LOW';
          }
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
          instructions: focusRefinement ? `${instructions}\n\nAnalyst Insight: ${focusRefinement}` : instructions, // Use Insight label
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
