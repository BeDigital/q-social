import { WebSocketService } from '../websocketService';
import { io, Socket } from 'socket.io-client';

jest.mock('socket.io-client');

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    } as unknown as jest.Mocked<Socket>;

    (io as jest.Mock).mockReturnValue(mockSocket);
    service = WebSocketService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a singleton instance', () => {
    const instance1 = WebSocketService.getInstance();
    const instance2 = WebSocketService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe('connect', () => {
    it('establishes connection with valid token', async () => {
      const token = 'valid-token';
      const connectPromise = service.connect(token);

      // Simulate successful connection
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectCallback) connectCallback();

      await expect(connectPromise).resolves.toBeUndefined();
      expect(io).toHaveBeenCalledWith(expect.any(String), {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: expect.any(Number),
        reconnectionDelay: expect.any(Number),
      });
    });

    it('handles connection errors', async () => {
      const token = 'invalid-token';
      const connectPromise = service.connect(token);

      // Simulate connection error
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];
      if (errorCallback) errorCallback(new Error('Connection failed'));

      await expect(connectPromise).rejects.toThrow('Failed to connect to WebSocket server');
    });
  });

  describe('event handling', () => {
    it('registers and triggers event handlers', () => {
      const handler = jest.fn();
      service.on('test-event', handler);

      // Simulate event
      const eventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'test-event'
      )?.[1];
      if (eventCallback) eventCallback({ data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('removes event handlers', () => {
      const handler = jest.fn();
      service.on('test-event', handler);
      service.off('test-event', handler);

      // Simulate event
      const eventCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'test-event'
      )?.[1];
      if (eventCallback) eventCallback({ data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('emits events when connected', () => {
      service.emit('test-event', { data: 'test' });
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('throws error when not connected', () => {
      mockSocket.connected = false;
      expect(() => {
        service.emit('test-event', { data: 'test' });
      }).toThrow('WebSocket is not connected');
    });
  });

  describe('disconnect', () => {
    it('disconnects the socket', () => {
      service.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('real-time features', () => {
    it('sends typing status', () => {
      service.sendTypingStatus(1, true);
      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        postId: 1,
        isTyping: true,
      });
    });

    it('updates online status', () => {
      service.updateOnlineStatus('online');
      expect(mockSocket.emit).toHaveBeenCalledWith('status_update', {
        status: 'online',
      });
    });

    it('subscribes to posts', () => {
      service.subscribeToPosts(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_posts', {
        userId: 1,
      });
    });

    it('subscribes to comments', () => {
      service.subscribeToComments(1);
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_comments', {
        postId: 1,
      });
    });
  });
});
