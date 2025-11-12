export interface Question {
  id: string;
  text: string;
  description?: string;
  placeholder: string;
  maxLength: number;
  header?: string;
  referenceQuestion?: string;
}

export const FORM_QUESTIONS: Question[] = [
  {
    id: '1',
    text: 'Esa mochila es tan pesada que te estorba. No te deja moverte con total libertad.',
    description: '¿Qué te obliga a hacer que no quieres, o qué te impide empezar?\n\n**Ejemplos:**\n*1. Me impide buscar un trabajo nuevo por miedo a perder el actual.*\n*2. A decir que sí a mi familia en todo, aunque no siempre pueda.*\n*3. No invierto más en mi negocio por miedo a perder el dinero.*',
    placeholder: 'Escríbelo aquí',
    maxLength: 500,
    referenceQuestion: 'Esa mochila es tan pesada que te estorba. No te deja moverte con total libertad.',
  },
  {
    id: '2',
    text: 'Esa mochila pesa tanto, porque dentro hay "mensajes" o ideas viejas que alguien más metió ahí (tus papás, la sociedad, un ex).',
    description: '**Ejemplos:**\n*1. Hay que guardar el dinero porque se acaba rápido.*\n*2. Debo pensar primero en los demás antes que en mí.*\n*3. Las mujeres exitosas se quedan solas.*',
    placeholder: 'Escríbelo aquí',
    maxLength: 500,
    referenceQuestion: 'Esa mochila pesa tanto, porque dentro hay mensajes o ideas viejas que alguien más metió ahí',
  },
  {
    id: '3',
    text: '¿Quiénes están contigo celebrando este logro?',
    placeholder: 'Escríbelo aquí',
    maxLength: 500,
    referenceQuestion: '¿Quiénes están contigo celebrando este logro?',
  },
  {
    id: '4',
    text: '¿Qué fue lo más difícil que superaste para llegar hasta aquí?',
    placeholder: 'Escríbelo aquí',
    maxLength: 500,
    header: 'OPCIONAL',
    referenceQuestion: '¿Qué fue lo más difícil que superaste para llegar hasta aquí?',
  },
];
