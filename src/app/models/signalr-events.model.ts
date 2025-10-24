export interface SignalREvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface LocationUpdate {
  userId: string;
  userEmail: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface MarkerEvent {
  type: 'MarkerAdded' | 'MarkerUpdated' | 'MarkerRemoved';
  data: any;
  timestamp: Date;
}

export interface MessageEvent {
  fromUserId: string;
  fromUserEmail: string;
  message: string;
  timestamp: Date;
}

export interface StreetSheetEvent {
  type: 'StreetSheetUpdated';
  data: any;
  timestamp: Date;
}

export interface ConnectionStatus {
  isConnected: boolean;
  connectionId?: string;
  lastConnected?: Date;
  lastDisconnected?: Date;
  reconnectAttempts: number;
}
