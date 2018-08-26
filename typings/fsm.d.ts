declare module 'javascript-state-machine' {
  type TransitionFn = (this: StateMachine, ...args: any[]) => string;

  export interface Transition {
    name: string;
    from: string | string[];
    to: string | TransitionFn;
  }

  export interface Data {
    [key: string]: any;
  }

  export interface Methods {
    [key: string]: (this: StateMachine) => any;
  }

  interface Config {
    init: string;
    transitions: Transition[];
    data?: Data;
    methods?: Methods;
  }

  interface StateMachineMixin extends Data, Methods {}

  export default class StateMachine implements StateMachineMixin {
    static factory(config: Config): typeof StateMachine;
    state: string;
    constructor(config?: Config);
    toArray(this: StateMachine): any; 
    can(transition: string): boolean;
    typed(): void; // state transition
    blurred(): void; // state transition
    pending(): void; //state transition
    valid(): void; // state transition
    invalid(): void; // state transition
  }
}
