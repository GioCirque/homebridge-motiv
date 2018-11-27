import {
  timeSpanString,
  toTitleCase,
  getUTCDate,
  getUTCNowDate,
  splitDateAndTime,
} from '../lib/utils';

describe('Utility tests', () => {
  it('Should return h:mm:ss formatted time', () => {
    const milliseconds = 1000;
    const timeString01 = timeSpanString(
      new Date(1541389579 * milliseconds),
      new Date(1541424202 * milliseconds)
    );
    expect(timeString01).toEqual('09:37:02');

    const timeString02 = timeSpanString(
      new Date(0 * milliseconds),
      new Date(1541424202 * milliseconds)
    );
    expect(timeString02).toEqual('428173:23:22');
  });

  it('Should return a split date and time roughly equal to now', () => {
    const value = new Date();
    const { date, time } = splitDateAndTime();
    const parts = value.toISOString().split('T');
    expect(date).toEqual(parts[0]);
    expect(
      time
        .split(':')
        .slice(0, 2)
        .join(':')
    ).toEqual(
      parts[1]
        .split(':')
        .slice(0, 2)
        .join(':')
    );
  });

  it('Should return a split date and time equal to the input', () => {
    const parts = ['2018-11-05', '19:14:15.171Z'];
    const value = new Date(parts.join('T'));
    const { date, time } = splitDateAndTime(value);
    expect(date).toEqual(parts[0]);
    expect(time).toEqual(parts[1]);
  });

  it('Should return a UTC date', () => {
    const value = getUTCNowDate();
    const utcDate = getUTCDate(value);
    expect(utcDate).toEqual(value);
  });

  it('Should return a title cased value', () => {
    const value = 'the dog ran';
    const titled = toTitleCase(value);
    expect(titled).toBe('The Dog Ran');
  });

  it('Should return a non-title cased value', () => {
    const value = 'a';
    const titled = toTitleCase(value);
    expect(titled).toBe('a');
  });

  it('Should return an undefined value', () => {
    const value = undefined;
    const titled = toTitleCase(value);
    expect(titled).toBeUndefined();
  });
});
