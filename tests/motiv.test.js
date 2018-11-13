import { existsSync, readFileSync } from 'fs';
import { MotivApi } from '../lib/motiv';
import { useTestVariant, clearTestVariant } from 'https';

jest.mock('https');

const credentialsPath = `${__dirname}/../.credentials.json`;

describe('Motiv API Tests', () => {
  beforeEach(() => {
    clearTestVariant();
  });

  it('Should return the latest BPM heart rate', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(4);
    return motivApi.authenticate(credentials.username, credentials.password).then(() => {
      return motivApi
        .getLastHeartRate()
        .then((bpm) => {
          expect(bpm).toBeDefined();
          expect(bpm).toBeGreaterThan(0);
          return bpm;
        })
        .then(() => {
          return motivApi.getLastHeartRate().then((bpm) => {
            expect(bpm).toBeDefined();
            expect(bpm).toBeGreaterThan(0);
            return bpm;
          });
        });
    });
  });

  it('Should return a zero BPM heart rate', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(2);
    return motivApi.authenticate(credentials.username, credentials.password).then(() => {
      useTestVariant('empty');
      return motivApi.getLastHeartRate().then((bpm) => {
        expect(bpm).toBeDefined();
        expect(bpm).toBe(0);
        return bpm;
      });
    });
  });

  it('Should return the authenticated user profile', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(4);
    return motivApi.authenticate(credentials.username, credentials.password).then(() => {
      return motivApi
        .getUserProfile()
        .then((profile) => {
          expect(profile).toBeDefined();
          expect(profile.email).toBe('user@domain.com');
          return profile;
        })
        .then(() => {
          return motivApi.getUserProfile().then((profile) => {
            expect(profile).toBeDefined();
            expect(profile.email).toBe('user@domain.com');
          });
        });
    });
  });

  it('Should fail because of no authentication', () => {
    const motivApi = new MotivApi();
    expect.assertions(6);
    return motivApi
      .getLastAwakening()
      .catch((e) => {
        expect(e).toBeDefined();
        expect(e.message).toBe('Authentication required');
      })
      .then(() => {
        return motivApi.getUserProfile().catch((e) => {
          expect(e).toBeDefined();
          expect(e.message).toBe('Authentication required');
        });
      })
      .then(() => {
        return motivApi.getLastHeartRateRecord().catch((e) => {
          expect(e).toBeDefined();
          expect(e.message).toBe('Authentication required');
        });
      });
  });

  it('Should return a zero date and time', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(2);
    return motivApi.authenticate(credentials.username, credentials.password).then(() => {
      useTestVariant('empty');
      return motivApi.getLastAwakening().then((lastAwake) => {
        expect(lastAwake).toBeDefined();
        expect(lastAwake.getUTCSeconds()).toEqual(0);
      });
    });
  });

  it('Should return last sleep duration in minutes', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(4);
    return motivApi.authenticate(credentials.username, credentials.password).then(() => {
      return motivApi
        .getLastSleepMinutes()
        .then((sleepMinutes) => {
          expect(sleepMinutes).toBeDefined();
          expect(sleepMinutes).toBeGreaterThan(0);
          return sleepMinutes;
        })
        .then(() => {
          return motivApi.getLastSleepMinutes().then((sleepMinutes) => {
            expect(sleepMinutes).toBeDefined();
            expect(sleepMinutes).toBeGreaterThan(0);
            return sleepMinutes;
          });
        });
    });
  });

  it('Should return valid local date and time', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(2);
    return motivApi.authenticate(credentials.username, credentials.password).then(() => {
      return motivApi.getLastAwakening().then((lastAwake) => {
        const timeZoneOffset = new Date().getTimezoneOffset() * 60;
        expect(lastAwake).toBeDefined();
        expect(lastAwake.getTime() / 1000 + timeZoneOffset).toEqual(1541424202);
      });
    });
  });

  it('Should return valid login result', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(3);
    return motivApi
      .authenticate(credentials.username, credentials.password)
      .then((data, headers, response) => {
        expect(data).not.toBeNull();
        expect(headers).not.toBeNull();
        expect(response).not.toBeNull();
      });
  });

  it('Should return error login result', () => {
    if (!existsSync(credentialsPath)) {
      throw new Error('Missing .credentials file in root!');
    }
    const credentials = JSON.parse(readFileSync(credentialsPath).toString());
    const motivApi = new MotivApi();
    expect.assertions(5);
    useTestVariant('bad_credentials', 400);
    return motivApi.authenticate(credentials.username, credentials.password).catch((e) => {
      expect(e.data).toBeDefined();
      expect(e.data.code).toBeDefined();
      expect(e.data.error).toBeDefined();
      expect(e.headers).toBeDefined();
      expect(e.response).toBeDefined();
    });
  });
});
