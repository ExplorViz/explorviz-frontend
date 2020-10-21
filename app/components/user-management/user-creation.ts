import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import DS from 'ember-data';
import Role from 'explorviz-frontend/models/role';
import Setting from 'explorviz-frontend/models/setting';
import User from 'explorviz-frontend/models/user';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import RSVP, { all } from 'rsvp';
import Userpreference from 'explorviz-frontend/models/userpreference';

interface ISettings {
  [origin: string]: {
    [settingsype: string]: [[string, any]]|[],
  };
}

type Page = 'createSingleUser'|'createMultipleUsers';

interface IUserTrimmed {
  id: string;
  username: string;
  password: string;
}

export default class UserCreation extends Component {
  @service('store') store!: DS.Store;

  @service('user-settings') userSettings!: UserSettings;

  @service printThis!: any;

  @tracked
  createdUsers: IUserTrimmed[] = [];

  @tracked
  showNewUsers: boolean = false;

  @tracked
  page: Page = 'createSingleUser';

  // {
  //   origin1: boolean1,
  //   origin2: boolean2
  //   ...
  // }
  @tracked
  useDefaultSettings: {
    [origin: string]: boolean,
  } = {};

  /*
    {
      origin1: {
        settingstype1: [[settingId1, value1], ...]
        settingstype2: [[settingId'1, value'1], ...]
      }
      origin2: {...}
    }
  */
  @tracked
  settings: ISettings = {};

  // single user creation input fields
  @tracked
  username = '';

  @tracked
  password = '';

  @tracked
  rolesSelectedSingle: Role[] = [];

  // multiple user creation input fields
  @tracked
  usernameprefix = '';

  @tracked
  numberofusers = '';

  @tracked
  rolesSelectedMultiple: Role[] = [];

  @tracked
  roles: Role[] = [];

  @task
  // eslint-disable-next-line
  initSettings = task(function* (this: UserCreation) {
    const settingTypes = [...this.userSettings.types];
    const allSettings: Setting[] = [];
    // get all settings
    settingTypes.forEach((type) => {
      const settings = this.store.peekAll(type);
      allSettings.pushObjects(settings.toArray());
    });

    const origins: string[] = [...new Set(allSettings.mapBy('origin'))];

    const settingsByOrigin: ISettings = {};

    origins.forEach((origin) => {
      this.useDefaultSettings[origin] = true;
      // initialize settings object for origin containing arrays for every type
      settingsByOrigin[origin] = {};
      settingTypes.forEach((type) => {
        settingsByOrigin[origin][type] = [];
      });
    });

    // copy all settings to settingsByOrigin
    // use default if no perefenrece exists for user, else use preference value
    allSettings.forEach((setting) => {
      // @ts-ignore
      settingsByOrigin[setting.origin][setting.constructor.modelName].push(
        // @ts-ignore
        [setting.id, setting.defaultValue],
      );
    });
    this.settings = settingsByOrigin;
  });

  @task
  // eslint-disable-next-line
  saveUser = task(function* (this: UserCreation) {
    const { username, password, rolesSelectedSingle } = this;

    // check for valid input
    if (!username || username.length === 0) {
      AlertifyHandler.showAlertifyWarning('Username cannot be empty.');
      return;
    }
    if (!password || password.length === 0) {
      AlertifyHandler.showAlertifyWarning('Password cannot be empty.');
      return;
    }
    if (!rolesSelectedSingle || rolesSelectedSingle.length === 0) {
      AlertifyHandler.showAlertifyWarning('User needs at least 1 role.');
      return;
    }

    const roles = rolesSelectedSingle.map((role: Role) => role.id);

    const userRecord = this.store.createRecord('user', {
      password,
      roles,
      username,
    });

    function createPreferences(this: UserCreation, uid: string) {
      const settingsPromiseArray: RSVP.Promise<Userpreference>[] = [];

      const settings = Object.entries(this.settings);

      settings.forEach(([origin, settingsObject]) => {
        if (this.useDefaultSettings[origin]) {
          return;
        }

        const allSettings = [...Object.values(settingsObject)].flat();
        // create records for the preferences and save them
        allSettings.forEach(([settingId, value]) => {
          const preferenceRecord = this.store.createRecord('userpreference', {
            settingId,
            userId: uid,
            value,
          });
          settingsPromiseArray.push(preferenceRecord.save());
        });
      });

      return all(settingsPromiseArray);
    }

    function clearInputFields(this: UserCreation) {
      this.username = '';
      this.password = '';
      this.rolesSelectedSingle = [];
    }

    try {
      yield userRecord.save();
      yield createPreferences.bind(this)(userRecord.id);
      AlertifyHandler.showAlertifySuccess(`User <b>${username}</b> was created.`);
      clearInputFields.bind(this)();
    } catch (reason) {
      UserCreation.showReasonErrorAlert(reason);
      userRecord.deleteRecord();
    }
  });

  @task
  // eslint-disable-next-line
  saveMultipleUsers = task(function* (this: UserCreation) {
    const PASSWORD_LENGTH = 8;

    const { usernameprefix, numberofusers, rolesSelectedMultiple } = this;
    const numberOfUsers = parseInt(numberofusers, 10);

    // check for valid input
    if (!usernameprefix || usernameprefix.length === 0) {
      AlertifyHandler.showAlertifyWarning('Username prefix cannot be empty.');
      return;
    }
    if (!numberofusers || numberOfUsers <= 1) {
      AlertifyHandler.showAlertifyWarning('# of users must be at least 2.');
      return;
    }
    if (!rolesSelectedMultiple || rolesSelectedMultiple.length === 0) {
      AlertifyHandler.showAlertifyWarning('Users need at least 1 role.');
      return;
    }

    const largeNumberOfUsers = 65;

    if (numberOfUsers >= largeNumberOfUsers) {
      const messageAliveTime = 5;
      AlertifyHandler.showAlertifyMessageWithDuration(
        'User creation might take some time. You will be notified when it\'s done.',
        messageAliveTime,
        'warning',
      );
    }

    const passwords = UserCreation.generatePasswords(numberOfUsers, PASSWORD_LENGTH);

    const roles = rolesSelectedMultiple.map((role: Role) => role.id);

    const preferences: {[settingId: string]: any} = {};

    // for all settings, add a preference for the new users if default settings was not chosen.
    const settings = Object.entries(this.settings);
    settings.forEach(([origin, settingsObject]) => {
      if (this.useDefaultSettings[origin]) {
        return;
      }

      const allSettings = [...Object.values(settingsObject)].flat();
      // create records for the preferences and save them
      allSettings.forEach(([settingId, value]) => {
        preferences[settingId] = value;
      });
    });

    const userBatchRecord = this.store.createRecord('userbatchrequest', {
      count: numberOfUsers,
      passwords,
      preferences,
      prefix: usernameprefix,
      roles,
    });

    function clearInputFields(this: UserCreation) {
      this.usernameprefix = '';
      this.numberofusers = '';
      this.rolesSelectedMultiple = [];
    }

    try {
      yield userBatchRecord.save();
      const users: DS.ManyArray<User> = yield userBatchRecord.users;
      AlertifyHandler.showAlertifySuccess('All users were successfully created.');
      clearInputFields.bind(this)();
      this.showCreatedUsers(users.toArray(), passwords);
    } catch (reason) {
      UserCreation.showReasonErrorAlert(reason);
    } finally {
      userBatchRecord.unloadRecord();
    }
  });

  @task
  // eslint-disable-next-line
  getRoles = task(function* (this: UserCreation) {
    const roles: DS.RecordArray<Role> = yield this.store.findAll('role', { reload: true });
    this.roles = roles.toArray();
  });

  constructor(owner: any, args: any) {
    super(owner, args);

    this.initSettings.perform();
  }

  @action
  changePage(pageName: Page) {
    this.page = pageName;
  }

  @action
  printNewUsers() {
    const selector = '#new-user-list';
    const options = {
      printDelay: 200,
    };

    this.printThis.print(selector, options);
  }

  @action
  hideNewUsersCreatedModal() {
    this.createdUsers = [];
    this.showNewUsers = false;
  }

  @action
  updateSingleUserRoles(roles: Role[]) {
    this.rolesSelectedSingle = roles;
  }

  @action
  updateMultipleUserRoles(roles: Role[]) {
    this.rolesSelectedMultiple = roles;
  }

  @action
  toggleDefaultSetting(origin: string) {
    this.useDefaultSettings = {
      ...this.useDefaultSettings,
      [origin]: !this.useDefaultSettings[origin],
    };
  }

  @action
  updateSetting(origin: string, type: string, index: number, value: any) {
    this.settings[origin][type][index][1] = value;

    // copy settings, so update is recognized -> reassignment of field needed
    this.settings = { ...this.settings };
  }

  static generatePasswords(count: number, length: number) {
    const passwords = [];

    for (let i = 1; i <= count; i++) {
      passwords.push(UserCreation.generatePassword(length));
    }
    return passwords;
  }

  static generatePassword(length: number) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const n = charset.length;

    let retVal = '';
    for (let i = 0; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  static showReasonErrorAlert(reason: any) {
    const { title, detail } = reason.errors[0];
    AlertifyHandler.showAlertifyError(`<b>${title}:</b> ${detail}`);
  }

  showCreatedUsers(userList: User[], passwords: string[]) {
    const createdUsers: IUserTrimmed[] = [];
    for (let i = 0; i < userList.length; i++) {
      const user = userList[i];
      if (user !== undefined) {
        const password = passwords[i];
        createdUsers.push({
          id: user.id,
          password,
          username: user.username,
        });
      }
    }
    this.createdUsers = createdUsers;
    this.showNewUsers = true;
  }
}
