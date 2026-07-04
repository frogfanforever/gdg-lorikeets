/**
 * Golden eval cases for the TRIZ solver agent.
 *
 * Each case describes a real engineering trade-off and optionally specifies:
 *  - improvingParamIds:  expected TRIZ parameter IDs for the improving side (1–39)
 *  - worseningParamIds:  expected TRIZ parameter IDs for the worsening side (1–39)
 *  - mustDelegate:       subagent names that must appear in tool-call log
 *
 * Parameter ID cheatsheet (key ones referenced below):
 *   1  Weight of moving object      2  Weight of stationary object
 *   4  Length / size                5  Area of moving object
 *   7  Volume of moving object      9  Speed
 *  10  Force                       11  Stress / pressure
 *  14  Strength                    15  Duration of action (moving object)
 *  17  Temperature                 21  Power
 *  22  Loss of energy              25  Loss of time
 *  26  Quantity of substance       27  Reliability
 *  28  Measurement accuracy        30  Harmful side effects
 *  31  Harmful side effects ext.   32  Ease of manufacture
 *  33  Ease of operation           36  Device complexity
 */

export interface EvalCase {
  id: string;
  problem: string;
  context?: string;
  expect: {
    improvingParamIds?: number[];
    worseningParamIds?: number[];
    mustDelegate?: string[];
  };
}

export const EVAL_CASES: EvalCase[] = [
  {
    id: 'ewaste-recovery',
    problem:
      'Zaproponuj sposób na zwiększenie bezpiecznego odzysku materiałów z elektrośmieci, przy zachowaniu rocznych upgrade\'ów telefonów.',
    context:
      'Producenci smartfonów zachęcają do corocznej wymiany urządzeń (SDG 12), co napędza górę elektrośmieci. Bezpieczny odzysk metali ziem rzadkich wymaga demontażu, który jest wolny, kosztowny i niebezpieczny dla pracowników.',
    expect: {
      // Ease of manufacture (32) / ease of operation (33) / productivity (39)
      improvingParamIds: [32, 33, 39],
      // Harmful side effects (30/31)
      worseningParamIds: [25, 30, 31],
      mustDelegate: ['parameter-mapper'],
    },
  },
  {
    id: 'aircraft-wing-strength-weight',
    problem:
      'Zwiększenie grubości skrzydeł samolotu poprawia wytrzymałość konstrukcji, ale zwiększa masę i opór aerodynamiczny. Jak rozwiązać tę sprzeczność?',
    expect: {
      // Strength (14) vs Weight of moving object (1)
      improvingParamIds: [14],
      worseningParamIds: [1],
      mustDelegate: ['parameter-mapper', 'principle-finder'],
    },
  },
  {
    id: 'battery-energy-safety',
    problem:
      'Bateria litowo-jonowa z wyższą gęstością energii pozwala na dłuższe działanie urządzenia, ale zwiększa ryzyko przegrzania i pożaru.',
    expect: {
      // Energy density ~ Power (21) / Loss of energy (22) vs Harmful side effects (30)
      improvingParamIds: [21, 22],
      worseningParamIds: [30],
      mustDelegate: ['parameter-mapper'],
    },
  },
  {
    id: 'drug-delivery-precision',
    problem:
      'Lek o wyższym stężeniu działa skuteczniej, ale powoduje silniejsze skutki uboczne. Jak zwiększyć skuteczność bez wzrostu toksyczności?',
    expect: {
      // Reliability (27) / productivity (39) — both valid for drug effectiveness
      improvingParamIds: [27, 39],
      worseningParamIds: [30, 31],
      mustDelegate: ['parameter-mapper'],
    },
  },
  {
    id: 'bridge-span-deflection',
    problem:
      'Zwiększenie rozpiętości mostu pozwala uniknąć filarów w korycie rzeki, ale powoduje nadmierne ugięcie i drgania.',
    expect: {
      // Length (4) vs Strength (14) / Stress (11)
      improvingParamIds: [4],
      worseningParamIds: [11, 14],
      mustDelegate: ['parameter-mapper', 'principle-finder'],
    },
  },
  {
    id: 'software-response-time-accuracy',
    problem:
      'System rozpoznawania mowy działa szybciej, gdy używa mniejszego modelu, ale wtedy dokładność spada. Jak jednocześnie skrócić czas odpowiedzi i zachować wysoką dokładność?',
    expect: {
      // Speed (9) vs Measurement accuracy (28)
      improvingParamIds: [9, 25],
      worseningParamIds: [28],
      mustDelegate: ['parameter-mapper'],
    },
  },
  {
    id: 'thermal-insulation-conductivity',
    problem:
      'Grubsza izolacja termiczna budynku zmniejsza straty ciepła, ale utrudnia odprowadzanie ciepła z elektroniki wewnątrz ścian.',
    expect: {
      // Temperature (17) / Loss of energy (22) — both valid; agent sometimes
      // maps energy conservation as improving [22] and heat dissipation as worsening [17]
      improvingParamIds: [17, 22],
      worseningParamIds: [17, 22],
      mustDelegate: ['parameter-mapper'],
    },
  },
  {
    id: 'robot-speed-precision',
    problem:
      'Robot przemysłowy, który porusza się szybciej, wykonuje więcej operacji na minutę, ale traci dokładność pozycjonowania.',
    expect: {
      // Speed (9) / Productivity (39) — both valid for "more operations per minute"
      // Measurement accuracy (28) / Accuracy of manufacturing (29)
      improvingParamIds: [9, 39],
      worseningParamIds: [28, 29],
      mustDelegate: ['parameter-mapper', 'principle-finder'],
    },
  },
];
