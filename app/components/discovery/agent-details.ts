import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import DS from 'ember-data';
import Agent from 'explorviz-frontend/models/agent';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';

interface IArgs {
  agent: Agent;
  errorHandling(errorArray: any): void;
  toggleAgentVisibility(): void;
}

export default class AgentDetails extends Component<IArgs> {
  @service('store') store!: DS.Store;

  @tracked
  showSpinner = false;

  @action
  saveAgent() {
    const self = this;

    const { agent } = this.args;

    if (agent.get('hasDirtyAttributes')) {
      this.showSpinner = true;

      agent.save().then(() => {
        self.showSpinner = false;
        AgentDetails.handleMessageForUser();
      })
        .catch((errorObject) => {
          agent.rollbackAttributes();

          set(agent, 'errorOccured', true);
          set(agent, 'errorMessage', errorObject);

          // closure action from discovery controller
          self.args.errorHandling(errorObject);
        });
    } else {
      AgentDetails.handleMessageForUser();
    }
  }

  static handleMessageForUser() {
    AlertifyHandler.showAlertifyMessage('Agent updated. Click on <b>Discovery</b> to go back.');
  }
}