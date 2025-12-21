import { AnalystInsight } from '../data/schema';

/**
 * PRD §3.4.1.1: Deterministic Fallback Templates
 * 
 * These templates are used when:
 * 1. LLM generation fails
 * 2. LLM output fails validation
 * 3. LLM is unavailable
 * 
 * All templates are validated to pass the same constraints as LLM-generated content.
 */

type Category = 'STRENGTH' | 'ENDURANCE' | 'NEURAL' | 'REGULATION';
type StimulusType = 'OVERLOAD' | 'MAINTENANCE' | 'FLUSH' | 'TEST';

interface Template {
  sessionFocus: string;
  avoidCue: string;
  analystInsight: {
    summary: string;
    detail?: string;
  };
}

const TEMPLATES: Record<Category, Record<StimulusType, Template>> = {
  STRENGTH: {
    OVERLOAD: {
      sessionFocus: 'Heavy, crisp reps with full recovery between sets.',
      avoidCue: 'Rushing reps or cutting rest short—quality over volume.',
      analystInsight: {
        summary: 'Recovery markers support high-force work. Loading heavy with full rest to drive strength adaptation.',
        detail: 'HRV and sleep indicate readiness for neuromuscular stress. Focus on movement quality and complete recovery between efforts to maximize force output without accumulating fatigue.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Moderate load, controlled tempo—maintain strength without strain.',
      avoidCue: 'Pushing to failure or adding volume—keep it crisp.',
      analystInsight: {
        summary: 'Maintaining strength base without adding stress. Moderate intensity keeps the system primed.',
        detail: 'Current recovery state supports maintenance work. Use familiar movements at moderate loads to preserve strength without digging into reserves.'
      }
    },
    FLUSH: {
      sessionFocus: 'Light movement, blood flow focus—active recovery only.',
      avoidCue: 'Any intensity or complexity—this is restoration work.',
      analystInsight: {
        summary: 'Recovery is suppressed. Light movement promotes circulation without adding load.',
        detail: 'Biometric markers indicate need for active recovery. Gentle movement helps clear metabolic waste and restore parasympathetic tone without adding training stress.'
      }
    },
    TEST: {
      sessionFocus: 'Max effort, full preparation—test current capacity.',
      avoidCue: 'Undertesting or second-guessing—commit to the attempt.',
      analystInsight: {
        summary: 'System is primed for performance testing. Full recovery supports maximum expression.',
        detail: 'All markers align for testing day. Adequate taper and recovery allow for true capacity assessment. Warm up thoroughly and execute with confidence.'
      }
    }
  },

  ENDURANCE: {
    OVERLOAD: {
      sessionFocus: 'Sustained effort, controlled breathing—build aerobic ceiling.',
      avoidCue: 'Spiking heart rate or going anaerobic—stay aerobic.',
      analystInsight: {
        summary: 'Aerobic capacity can be pushed. Sustained Zone 2-3 work builds mitochondrial density.',
        detail: 'Recovery and stress markers support extended aerobic work. Focus on nasal breathing and conversational pace to maximize aerobic adaptation without excessive stress.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Steady, conversational pace—build aerobic base without stress.',
      avoidCue: 'Pushing into breathless zones—keep HR controlled.',
      analystInsight: {
        summary: 'Maintaining aerobic base with moderate volume. Easy pace preserves fitness without fatigue.',
        detail: 'Current state supports steady aerobic work. Keep intensity low and duration moderate to maintain cardiovascular fitness while managing overall load.'
      }
    },
    FLUSH: {
      sessionFocus: 'Easy movement, nasal breathing—restore circulation.',
      avoidCue: 'Any intensity or duration—this is active rest.',
      analystInsight: {
        summary: 'Recovery is priority. Light aerobic work aids circulation without adding stress.',
        detail: 'Biometrics indicate need for restoration. Gentle movement at very low intensity promotes recovery without interfering with adaptation.'
      }
    },
    TEST: {
      sessionFocus: 'Race pace, full commitment—test aerobic capacity.',
      avoidCue: 'Holding back or pacing conservatively—execute the plan.',
      analystInsight: {
        summary: 'System is ready for aerobic testing. Recovery supports maximum sustained output.',
        detail: 'All indicators support performance testing. Taper has been adequate. Execute race pace with confidence and assess current aerobic ceiling.'
      }
    }
  },

  NEURAL: {
    OVERLOAD: {
      sessionFocus: 'Complex patterns, high attention—drive neural adaptation.',
      avoidCue: 'Fatigue or distraction—stop when quality drops.',
      analystInsight: {
        summary: 'Neural drive is high. Complex skill work builds coordination without metabolic cost.',
        detail: 'HRV and cognitive markers support technical work. Focus on movement quality and novel patterns to drive neural adaptation while managing physical load.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Familiar patterns, moderate complexity—maintain coordination.',
      avoidCue: 'Novelty or high complexity—keep it familiar.',
      analystInsight: {
        summary: 'Maintaining neural patterns with moderate practice. Familiar movements preserve skill.',
        detail: 'Current state supports skill maintenance. Use well-practiced movements at moderate intensity to keep neural pathways active without excessive demand.'
      }
    },
    FLUSH: {
      sessionFocus: 'Simple movement, low cognitive load—restore nervous system.',
      avoidCue: 'Complexity or decision-making—keep it automatic.',
      analystInsight: {
        summary: 'Nervous system needs rest. Simple, automatic movement aids recovery.',
        detail: 'Stress and recovery markers indicate neural fatigue. Use simple, rhythmic movement to promote parasympathetic recovery without cognitive demand.'
      }
    },
    TEST: {
      sessionFocus: 'Peak performance, full focus—test skill ceiling.',
      avoidCue: 'Hesitation or overthinking—trust training.',
      analystInsight: {
        summary: 'Neural system is primed. Testing day for skill and coordination.',
        detail: 'Recovery and readiness markers support performance testing. Neural pathways are fresh. Execute with confidence and assess current skill ceiling.'
      }
    }
  },

  REGULATION: {
    OVERLOAD: {
      sessionFocus: 'Breathwork, vagal tone—build autonomic capacity.',
      avoidCue: 'Intensity or complexity—this is regulation work.',
      analystInsight: {
        summary: 'Building autonomic resilience. Focused breathwork enhances vagal tone.',
        detail: 'Stress markers indicate need for regulation training. Deliberate breathwork and parasympathetic activation build capacity to manage stress.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Gentle breathwork, mindful movement—maintain balance.',
      avoidCue: 'Pushing or striving—this is maintenance.',
      analystInsight: {
        summary: 'Maintaining autonomic balance with gentle practice. Regular regulation preserves resilience.',
        detail: 'Current state supports regulation maintenance. Use familiar breathwork and mindful movement to keep autonomic system balanced.'
      }
    },
    FLUSH: {
      sessionFocus: 'Gentle movement, nasal breathing—restore parasympathetic tone.',
      avoidCue: 'Intensity or complexity—this is active recovery only.',
      analystInsight: {
        summary: 'Autonomic system needs restoration. Gentle movement promotes parasympathetic recovery.',
        detail: 'Stress and HRV markers indicate sympathetic dominance. Use slow, rhythmic movement and nasal breathing to restore parasympathetic tone.'
      }
    },
    TEST: {
      sessionFocus: 'Stress exposure, controlled recovery—test resilience.',
      avoidCue: 'Avoiding challenge—this is capacity testing.',
      analystInsight: {
        summary: 'Testing autonomic resilience. Controlled stress exposure reveals capacity.',
        detail: 'Recovery markers support stress testing. Use controlled challenge followed by deliberate recovery to assess autonomic capacity and resilience.'
      }
    }
  }
};

export interface TemplateOptions {
  source: 'FALLBACK';
  reason?: string[];
}

export class FocusAvoidTemplates {
  /**
   * Get deterministic template for given directive
   */
  static getTemplate(
    category: Category,
    stimulusType: StimulusType,
    options?: TemplateOptions
  ): {
    sessionFocus: string;
    avoidCue: string;
    analystInsight: AnalystInsight;
    source: 'FALLBACK';
  } {
    const template = TEMPLATES[category][stimulusType];

    return {
      sessionFocus: template.sessionFocus,
      avoidCue: template.avoidCue,
      analystInsight: {
        summary: template.analystInsight.summary,
        detail: template.analystInsight.detail,
        generatedAt: new Date().toISOString(),
        source: 'FALLBACK',
        validationPassed: true,
        retryCount: options?.reason ? 1 : 0
      },
      source: 'FALLBACK'
    };
  }

  /**
   * Validate that all templates exist and are well-formed
   */
  static validateAllTemplates(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const categories: Category[] = ['STRENGTH', 'ENDURANCE', 'NEURAL', 'REGULATION'];
    const stimulusTypes: StimulusType[] = ['OVERLOAD', 'MAINTENANCE', 'FLUSH', 'TEST'];

    for (const category of categories) {
      for (const stimulusType of stimulusTypes) {
        const template = TEMPLATES[category]?.[stimulusType];
        
        if (!template) {
          errors.push(`Missing template for ${category} + ${stimulusType}`);
          continue;
        }

        // Validate sessionFocus
        if (!template.sessionFocus || template.sessionFocus.length > 160) {
          errors.push(`${category}/${stimulusType}: sessionFocus invalid (length: ${template.sessionFocus?.length || 0})`);
        }

        // Validate avoidCue
        if (!template.avoidCue || template.avoidCue.length > 120) {
          errors.push(`${category}/${stimulusType}: avoidCue invalid (length: ${template.avoidCue?.length || 0})`);
        }

        // Validate analystInsight
        if (!template.analystInsight?.summary || template.analystInsight.summary.length > 300) {
          errors.push(`${category}/${stimulusType}: analystInsight.summary invalid`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
