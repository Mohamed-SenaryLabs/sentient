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
      sessionFocus: 'Heavy lifts, full rest—quality over speed.',
      avoidCue: 'Don\'t rush reps or cut rest—keep it crisp.',
      analystInsight: {
        summary: 'Recovery looks good. Heavy work is appropriate today.',
        detail: 'Sleep and readiness support high-force training. Focus on movement quality with complete recovery between efforts.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Moderate load, controlled tempo—maintain strength without strain.',
      avoidCue: 'Don\'t push to failure or add volume—keep it crisp.',
      analystInsight: {
        summary: 'Maintaining strength base without adding fatigue.',
        detail: 'Current recovery supports maintenance work. Use familiar movements at moderate loads to preserve strength without digging into reserves.'
      }
    },
    FLUSH: {
      sessionFocus: 'Light movement, easy pace—active recovery only.',
      avoidCue: 'Avoid any intensity or complexity—this is restoration work.',
      analystInsight: {
        summary: 'Recovery is suppressed. Light movement helps without adding load.',
        detail: 'Readiness markers indicate need for active recovery. Gentle movement promotes circulation without adding training cost.'
      }
    },
    TEST: {
      sessionFocus: 'Max effort, full preparation—test current capacity.',
      avoidCue: 'Don\'t undertest or second-guess—commit to the attempt.',
      analystInsight: {
        summary: 'System is primed for performance testing. Full recovery supports max expression.',
        detail: 'All markers align for testing day. Adequate taper and recovery allow for true capacity assessment. Warm up thoroughly and commit with confidence.'
      }
    }
  },

  ENDURANCE: {
    OVERLOAD: {
      sessionFocus: 'Sustained effort, controlled breathing—build aerobic ceiling.',
      avoidCue: 'Don\'t spike heart rate or go breathless—stay aerobic.',
      analystInsight: {
        summary: 'Aerobic capacity can be pushed. Sustained Zone 2-3 work builds endurance.',
        detail: 'Recovery and readiness support extended aerobic work. Focus on nasal breathing and conversational pace to build aerobic capacity without excessive cost.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Steady, conversational pace—build base without accumulating fatigue.',
      avoidCue: 'Avoid breathless surges—keep effort easy and even.',
      analystInsight: {
        summary: 'Maintenance today preserves fitness without adding recovery cost.',
        detail: 'Current state supports steady aerobic work. Keep intensity low and duration moderate to maintain cardiovascular fitness while managing overall load.'
      }
    },
    FLUSH: {
      sessionFocus: 'Easy movement, nasal breathing—restore circulation.',
      avoidCue: 'Avoid any intensity or duration—this is active rest.',
      analystInsight: {
        summary: 'Recovery is priority. Light aerobic work aids circulation without adding cost.',
        detail: 'Readiness indicates need for restoration. Gentle movement at very low intensity promotes recovery without interfering with adaptation.'
      }
    },
    TEST: {
      sessionFocus: 'Race pace, full commitment—test aerobic capacity.',
      avoidCue: 'Don\'t hold back or pace conservatively—commit to the plan.',
      analystInsight: {
        summary: 'System is ready for aerobic testing. Recovery supports maximum sustained output.',
        detail: 'All indicators support performance testing. Taper has been adequate. Run race pace with confidence and assess current aerobic ceiling.'
      }
    }
  },

  NEURAL: {
    OVERLOAD: {
      sessionFocus: 'Complex patterns, high attention—drive coordination gains.',
      avoidCue: 'Stop when fatigue or distraction appears—quality drops fast.',
      analystInsight: {
        summary: 'Focus is high. Complex skill work builds coordination without physical cost.',
        detail: 'Readiness and cognitive markers support technical work. Focus on movement quality and novel patterns to drive coordination gains while managing physical load.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Familiar patterns, moderate complexity—maintain coordination.',
      avoidCue: 'Avoid novelty or high complexity—keep it familiar.',
      analystInsight: {
        summary: 'Maintaining coordination with moderate practice. Familiar movements preserve skill.',
        detail: 'Current state supports skill maintenance. Use well-practiced movements at moderate intensity to keep coordination active without excessive demand.'
      }
    },
    FLUSH: {
      sessionFocus: 'Simple movement, low cognitive load—restore nervous system.',
      avoidCue: 'Avoid complexity or decision-making—keep it automatic.',
      analystInsight: {
        summary: 'Nervous system needs rest. Simple, automatic movement aids recovery.',
        detail: 'Readiness and recovery markers indicate mental fatigue. Use simple, rhythmic movement to promote recovery without cognitive demand.'
      }
    },
    TEST: {
      sessionFocus: 'Peak performance, full focus—test skill ceiling.',
      avoidCue: 'Don\'t hesitate or overthink—trust training.',
      analystInsight: {
        summary: 'Focus is primed. Testing day for skill and coordination.',
        detail: 'Recovery and readiness markers support performance testing. Coordination pathways are fresh. Perform with confidence and assess current skill ceiling.'
      }
    }
  },

  REGULATION: {
    OVERLOAD: {
      sessionFocus: 'Breathwork, calm focus—build stress capacity.',
      avoidCue: 'Avoid intensity or complexity—this is regulation work.',
      analystInsight: {
        summary: 'Building stress resilience. Focused breathwork enhances recovery capacity.',
        detail: 'Readiness markers indicate need for regulation training. Deliberate breathwork and calm practice build capacity to manage stress.'
      }
    },
    MAINTENANCE: {
      sessionFocus: 'Gentle breathwork, mindful movement—maintain balance.',
      avoidCue: 'Don\'t push or strive—this is maintenance.',
      analystInsight: {
        summary: 'Maintaining balance with gentle practice. Regular regulation preserves resilience.',
        detail: 'Current state supports regulation maintenance. Use familiar breathwork and mindful movement to keep stress response balanced.'
      }
    },
    FLUSH: {
      sessionFocus: 'Gentle movement, nasal breathing—restore calm.',
      avoidCue: 'Avoid intensity or complexity—this is active recovery only.',
      analystInsight: {
        summary: 'Stress system needs restoration. Gentle movement promotes recovery.',
        detail: 'Readiness and recovery markers indicate elevated stress. Use slow, rhythmic movement and nasal breathing to restore calm.'
      }
    },
    TEST: {
      sessionFocus: 'Stress exposure, controlled recovery—test resilience.',
      avoidCue: 'Don\'t avoid challenge—this is capacity testing.',
      analystInsight: {
        summary: 'Testing stress resilience. Controlled challenge reveals capacity.',
        detail: 'Recovery markers support stress testing. Use controlled challenge followed by deliberate recovery to assess stress capacity and resilience.'
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
