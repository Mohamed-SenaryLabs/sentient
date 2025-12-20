export interface Routine {
    id: string;
    category: 'STRENGTH' | 'ENDURANCE' | 'NEURAL' | 'REGULATION';
    archetypes: string[]; // ['RANGER', 'PALADIN', 'HYBRID', 'MONK', 'OPERATOR']
    title: string;
    subtitle: string;
    description: string;
    type: 'DURATION' | 'CALORIES' | 'STEPS' | 'HEART_RATE';
    target_value: number;
}

export const WORKOUT_LIBRARY: Routine[] = [
    // --- STRENGTH ---
    {
        id: 'str_5x5',
        category: 'STRENGTH',
        archetypes: ['PALADIN', 'HYBRID', 'OPERATOR'],
        title: 'Compound Power',
        subtitle: '5x5 Major Lifts',
        description: 'Squat, Deadlift, Bench, Overhead Press. 5 sets of 5 reps at 80% 1RM. Rest 3-5min.',
        type: 'CALORIES',
        target_value: 500
    },
    {
        id: 'str_kb_complex',
        category: 'STRENGTH',
        archetypes: ['RANGER', 'MONK', 'HYBRID'],
        title: 'Kettlebell Armor',
        subtitle: 'Double KB Complex',
        description: 'EMOM 20: 5 Dbl Clean, 5 Dbl Press, 5 Dbl Squat. Use dual 24kg (or scaling).',
        type: 'CALORIES',
        target_value: 400
    },
    {
        id: 'str_calisthenics',
        category: 'STRENGTH',
        archetypes: ['MONK', 'RANGER'],
        title: 'Bodyweight Mastery',
        subtitle: 'Volume Calisthenics',
        description: '100 Pull-ups, 200 Push-ups, 300 Squats. Partition as needed. Weighted vest optional.',
        type: 'CALORIES', 
        target_value: 350
    },

    // --- ENDURANCE ---
    {
        id: 'end_ruck',
        category: 'ENDURANCE',
        archetypes: ['RANGER', 'PALADIN', 'HYBRID'],
        title: 'Heavy Ruck',
        subtitle: 'Loaded March',
        description: 'Move with 45lb dry weight. Maintain sub-15min/mile pace. Target Zone 2 HR.',
        type: 'DURATION',
        target_value: 60
    },
    {
        id: 'end_zone2_run',
        category: 'ENDURANCE',
        archetypes: ['HYBRID', 'MONK', 'OPERATOR'],
        title: 'Aerobic Base',
        subtitle: 'Zone 2 Run',
        description: 'Strict nasal breathing check. Heart rate 130-150bpm. Conversational pace.',
        type: 'DURATION',
        target_value: 45
    },
    {
        id: 'end_intervals',
        category: 'ENDURANCE',
        archetypes: ['HYBRID', 'OPERATOR'],
        title: 'Lactate Threshold',
        subtitle: '4x8min Threshold',
        description: '8min @ Threshold (Zone 4), 2min easy. Repeat 4 times.',
        type: 'DURATION',
        target_value: 40
    },

    // --- NEURAL / HYBRID ---
    {
        id: 'neur_sprints',
        category: 'NEURAL',
        archetypes: ['OPERATOR', 'HYBRID'],
        title: 'Speed Work',
        subtitle: 'Hill Sprints',
        description: '10x 10sec max effort hill sprints. Full walking recovery between reps.',
        type: 'DURATION',
        target_value: 30
    },
    {
        id: 'neur_plyo',
        category: 'NEURAL',
        archetypes: ['MONK', 'OPERATOR'],
        title: 'Explosive Power',
        subtitle: 'Plyometrics',
        description: 'Box Jumps, Broad Jumps, Med Ball Slams. Focus on max height/distance, not fatigue.',
        type: 'DURATION',
        target_value: 20
    },

    // --- REGULATION ---
    {
        id: 'reg_mobility',
        category: 'REGULATION',
        archetypes: ['ALL', 'MONK'],
        title: 'System Reset',
        subtitle: 'Mobility Flow',
        description: 'Deep squat holds, thoracic rotation, hip openers. 2min per position.',
        type: 'DURATION',
        target_value: 20
    },
    {
        id: 'reg_breath',
        category: 'REGULATION',
        archetypes: ['ALL'],
        title: 'Downregulation',
        subtitle: 'Box Breathing',
        description: '4-4-4-4 Box Breathing drill. Dark room, lying supine.',
        type: 'DURATION',
        target_value: 15
    }
];
