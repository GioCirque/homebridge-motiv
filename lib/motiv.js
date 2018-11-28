const { secureGet, securePost } = require('./httpClient');
const { isEmptyOrUndef } = require('./utils');

const motivApiHost = 'motiv-api.prod.mymotiv.com';
const motivHeaders = {
  'User-Agent': 'Motiv/842 CFNetwork/975.0.3 Darwin/18.2.0',
  'X-Parse-App-Build-Version': '842',
  'X-Parse-Client-Version': 'i1.14.2',
  'X-Parse-OS-Version': '12.1 (16B92)',
  'X-Parse-App-Display-Version': '2.0.5',
  'X-Parse-Client-Key': 'fnirzSAp2gR77hL2cshFVc8fyBYDiNVhevlqDeMn',
  'X-Parse-Application-Id': 'hef3dbRS8HehUp8Tod7MAEdItZIt2qkZH8rZ5MJ4',
  'X-Parse-Installation-Id': '11ec7737-0d33-43e7-80da-8a7716cc8dbb',
};
const motivPaths = {
  login: '/parse/login',
  session: '/parse/sessions/me',
  userProfile: '/parse/classes/UserProfile',
  sleepEvent: '/parse/classes/SleepEvent',
  heartRate: '/parse/classes/HeartRateMinuteRecordCollection',
};
const milliseconds = 1000;

class MotivApi {
  constructor(authData) {
    this.needsAuth = true;
    this.processAuthData(authData);
  }

  processAuthData(authData) {
    const now = new Date(Date.now());
    var safeAuthData = authData || {
      userId: undefined,
      sessionToken: undefined,
      sessionExpiry: now,
    };
    this.userId = safeAuthData.userId;
    this.sessionToken = safeAuthData.sessionToken;
    this.sessionExpiry = new Date(Date.parse(safeAuthData.sessionExpiry));

    this.needsAuth =
      isEmptyOrUndef(this.userId) ||
      isEmptyOrUndef(this.sessionToken) ||
      isEmptyOrUndef(this.sessionExpiry) ||
      this.sessionExpiry < now;

    if (!this.needsAuth) {
      this.authenticatedHeaders = {
        ...motivHeaders,
        'X-Parse-Session-Token': this.sessionToken,
      };
    }
  }

  getAuthData() {
    return {
      userId: this.userId,
      sessionToken: this.sessionToken,
      sessionExpiry: this.sessionExpiry,
    };
  }

  getLastSleepMinutes() {
    return this.getLastSleepEvent().then((sleepEvent) => {
      return sleepEvent.sleepMinutes;
    });
  }

  getLastAwakening() {
    return this.getLastSleepEvent().then((sleepEvent) => {
      return new Date(sleepEvent.utcEnd * milliseconds);
    });
  }

  getLastHeartRate() {
    return this.getLastHeartRateRecord().then((heartRateRecord) => {
      return heartRateRecord.bpm;
    });
  }

  getLastHeartRateRecord() {
    const self = this;
    return new Promise((resolve, reject) => {
      if (self.needsAuth === true) {
        reject(new Error('Authentication required'));
        return;
      }

      const heartRateRequestData = {
        limit: '1',
        order: '-utcStart',
        _method: 'GET',
        where: { user: { __type: 'Pointer', className: '_User', objectId: self.userId } },
      };
      securePost(
        motivApiHost,
        motivPaths.heartRate,
        heartRateRequestData,
        self.authenticatedHeaders
      ).then((heartRateResultData) => {
        if (
          heartRateResultData &&
          heartRateResultData.results &&
          heartRateResultData.results.length > 0 &&
          heartRateResultData.results[0].heartRateRecords &&
          heartRateResultData.results[0].heartRateRecords.length > 0
        ) {
          self.lastHeartRateRecord = heartRateResultData.results[0].heartRateRecords.pop();
        } else {
          self.lastHeartRateRecord = {
            utcStart: 0,
            bpm: 0,
            utcEnd: 0,
            isAverage: 0,
            isAsync: 0,
          };
        }
        resolve(self.lastHeartRateRecord);
      });
    });
  }

  getLastSleepEvent() {
    const self = this;
    return new Promise((resolve, reject) => {
      if (self.needsAuth === true) {
        reject(new Error('Authentication required'));
        return;
      }

      const sleepRequestData = {
        limit: '1',
        order: '-updatedAt',
        _method: 'GET',
        where: { user: { __type: 'Pointer', className: '_User', objectId: self.userId } },
      };
      securePost(motivApiHost, motivPaths.sleepEvent, sleepRequestData, self.authenticatedHeaders)
        .then((sleepResultData) => {
          if (sleepResultData && sleepResultData.results && sleepResultData.results.length > 0) {
            self.lastSleepEvent = sleepResultData.results[0];
          } else {
            self.lastSleepEvent = { utcEnd: 0, sleepMinutes: 0 };
          }
          resolve(self.lastSleepEvent);
        })
        .catch(reject);
    });
  }

  getUserProfile() {
    const self = this;
    return new Promise((resolve, reject) => {
      if (self.needsAuth === true) {
        reject(new Error('Authentication required'));
        return;
      }

      const profileRequestData = {
        limit: '1',
        where: {
          user: { __type: 'Pointer', className: '_User', objectId: this.userId },
        },
        _method: 'GET',
      };

      // Load user profile data
      securePost(
        motivApiHost,
        motivPaths.userProfile,
        profileRequestData,
        self.authenticatedHeaders
      )
        .then((profileResultData) => {
          const firstResult = profileResultData.results[0];
          self.profileData = firstResult;
          resolve(self.profileData);
        })
        .catch(reject);
    });
  }

  authenticate(username, password) {
    const self = this;
    const authRequestData = { _method: 'GET', username: username, password: password };
    return securePost(motivApiHost, motivPaths.login, authRequestData, motivHeaders).then(
      (authResultData) => {
        self.authenticatedHeaders = {
          ...motivHeaders,
          'X-Parse-Session-Token': authResultData.sessionToken,
        };

        // Load session expiration data
        return secureGet(motivApiHost, motivPaths.session, self.authenticatedHeaders).then(
          (sessionResultData) => {
            self.processAuthData({
              userId: authResultData.objectId,
              sessionToken: authResultData.sessionToken,
              sessionExpiry: sessionResultData.expiresAt.iso,
            });
            return self.getAuthData();
          }
        );
      }
    );
  }
}

module.exports = {
  MotivApi,
};
