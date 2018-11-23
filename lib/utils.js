function timeSpanString(date1, date2) {
  return Array(3)
    .fill([3600, Math.abs(date1.getTime() - date2.getTime())])
    .map((v, i, a) => {
      a[i + 1] = [a[i][0] / 60, ((v[1] / (v[0] * 1000)) % 1) * (v[0] * 1000)];
      return Array(255)
        .fill('0')
        .concat(`${Math.floor(v[1] / (v[0] * 1000))}`.split(''))
        .map((c, ci, ca) => {
          return c !== '0' || ci >= ca.length - 2 ? c : '';
        })
        .join('');
    })
    .join(':');
}

function getUTCDate(date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

function splitDateAndTime(date) {
  const parts = (date || new Date()).toISOString().split('T');
  return {
    date: new Date(parts.shift()),
    time: parts.shift(),
  };
}

function getUTCNowDate() {
  return getUTCDate(new Date());
}

function isEmptyOrUndef(value) {
  return value === undefined || value === null || value === '';
}

module.exports = {
  timeSpanString,
  isEmptyOrUndef,
  getUTCNowDate,
  getUTCDate,
  splitDateAndTime,
};
