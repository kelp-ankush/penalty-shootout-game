import { SubscriptionType } from '@org/shared';

export interface IEventResponse {
  event: SubscriptionType;
  [key: string]: unknown;
}
