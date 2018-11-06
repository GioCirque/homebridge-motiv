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
};

const milliseconds = 1000;
const timeZoneOffset = new Date().getTimezoneOffset() * 60;

class MotivApi {
  constructor(authData) {
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
  }

  getAuthData() {
    return {
      userId: this.userId,
      sessionToken: this.sessionToken,
      sessionExpiry: this.sessionExpiry,
    };
  }

  getLastAwakening() {
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
      securePost(
        motivApiHost,
        motivPaths.sleepEvent,
        sleepRequestData,
        self.authenticatedHeaders
      ).then((sleepResultData) => {
        if (sleepResultData && sleepResultData.results && sleepResultData.results.length > 0) {
          self.lastSleepEvent = sleepResultData.results[0];
        } else {
          self.lastSleepEvent = { utcEnd: timeZoneOffset };
        }
        resolve(new Date((self.lastSleepEvent.utcEnd - timeZoneOffset) * milliseconds));
      });
    });
  }

  getUserProfile() {
    const self = this;
    const profileRequestData = {
      limit: '1',
      where: {
        user: { __type: 'Pointer', className: '_User', objectId: this.userId },
      },
      _method: 'GET',
    };

    // Load user profile data
    return securePost(
      motivApiHost,
      motivPaths.userProfile,
      profileRequestData,
      self.authenticatedHeaders
    ).then((profileResultData) => {
      const firstResult = profileResultData.results[0];
      self.profileData = firstResult;
      return self.profileData;
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
