import StateMachine from 'javascript-state-machine'; // tslint:disable-line
import { FieldState, FieldStatus } from '../types';

export const stringifyStatus = (...args: FieldStatus[]) => args.join('.');

export const statusifyString = (str: string): FieldStatus[] =>
  str.split('.').map((status: string) => Number.parseInt(status, 10));

export default StateMachine.factory({
  init: stringifyStatus(FieldStatus.Clean, FieldStatus.Untouched),
  transitions: [
    {
      name: 'valid',
      from: [
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Invalid),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Pending),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Invalid),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Pending),

      ],
      to: stringifyStatus(FieldStatus.Valid, FieldStatus.Dirty, FieldStatus.Touched),
    },
    {
      name: 'invalid',
      from: [
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Untouched),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Pending),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Pending),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Valid),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Valid),
      ],
      to(this: StateMachine) {
        let newStateArray: FieldStatus[] = [];

        newStateArray =
          statusifyString(this.state).indexOf(FieldStatus.Clean) !== -1
            ? newStateArray.concat(FieldStatus.Clean)
            : newStateArray.concat(FieldStatus.Dirty);

        newStateArray =
          statusifyString(this.state).indexOf(FieldStatus.Untouched) !== -1
            ? newStateArray.concat(FieldStatus.Untouched)
            : newStateArray.concat(FieldStatus.Touched);

        return stringifyStatus(...newStateArray.concat(FieldStatus.Invalid));
      },
    },
    {
      name: 'pending',
      from: [
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Valid),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Invalid),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Valid),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched, FieldStatus.Invalid),
      ],
      to(this: StateMachine) {
        const stateArray = statusifyString(this.state);

        if (stateArray.length === 2) {
          return stringifyStatus(...stateArray.concat(FieldStatus.Pending));
        }

        return stringifyStatus(...stateArray.slice(0, stateArray.length - 1).concat(FieldStatus.Pending));
      },
    },
    {
      name: 'typed',
      from: [
        stringifyStatus(FieldStatus.Clean, FieldStatus.Untouched),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Untouched, FieldStatus.Valid),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Untouched, FieldStatus.Invalid),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Valid),
        stringifyStatus(FieldStatus.Clean, FieldStatus.Touched, FieldStatus.Invalid),
      ],
      to(this: StateMachine) {
        const re = new RegExp(`${FieldStatus.Valid}|${FieldStatus.Invalid}`);
        const validity = this.state.match(re);
        const status = statusifyString(this.state).indexOf(FieldStatus.Untouched) !== -1
          ? stringifyStatus(FieldStatus.Dirty, FieldStatus.Untouched)
          : stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched);

        return validity
          ? status.concat(stringifyStatus(parseInt(validity[0], 10)))
          : status;
      },
    },
    {
      name: 'blurred',
      from: [
        stringifyStatus(FieldStatus.Clean, FieldStatus.Untouched),
        stringifyStatus(FieldStatus.Dirty, FieldStatus.Untouched),
      ],
      to(this: StateMachine) {
        return statusifyString(this.state).indexOf(FieldStatus.Clean) !== -1
          ? stringifyStatus(FieldStatus.Clean, FieldStatus.Touched)
          : stringifyStatus(FieldStatus.Dirty, FieldStatus.Touched);
      },
    },
  ],
  methods: {
    toArray(this: StateMachine): FieldStatus[] {
      return statusifyString(this.state);
    },
  },
});
