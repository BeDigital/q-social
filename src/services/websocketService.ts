import { io, Socket } from 'socket.io-client';
import config from '../../config';

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(config.server.apiUrl, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.reconnectAttempts++;
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to WebSocket server'));
          }
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.notifyEventHandlers('disconnect', reason);
        });

        // Handle incoming events
        this.socket.on('notification', (data) => {
          this.notifyEventHandlers('notification', data);
        });

        this.socket.on('post_update', (data) => {
          this.notifyEventHandlers('post_update', data);
        });

        this.socket.on('comment_update', (data) => {
          this.notifyEventHandlers('comment_update', data);
        });

        this.socket.on('like_update', (data) => {
          this.notifyEventHandlers('like_update', data);
        });

        this.socket.on('typing', (data) => {
          this.notifyEventHandlers('typing', data);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private notifyEventHandlers(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  emit(event: string, data: any): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket is not connected');
    }
    this.socket.emit(event, data);
  }

  // Typing indicator methods
  sendTypingStatus(postId: number, isTyping: boolean): void {
    this.emit('typing', { postId, isTyping });
  }

  // Online status methods
  updateOnlineStatus(status: 'online' | 'away' | 'offline'): void {
    this.emit('status_update', { status });
  }

  // Real-time feed methods
  subscribeToPosts(userId?: number): void {
    this.emit('subscribe_posts', { userId });
  }

  unsubscribeFromPosts(userId?: number): void {
    this.emit('unsubscribe_posts', { userId });
  }

  // Real-time comment methods
  subscribeToComments(postId: number): void {
    this.emit('subscribe_comments', { postId });
  }

  unsubscribeFromComments(postId: number): void {
    this.emit('unsubscribe_comments', { postId });
  }

  // Real-time like methods
  subscribeToLikes(postId: number): void {
    this.emit('subscribe_likes', { postId });
  }

  unsubscribeFromLikes(postId: number): void {
    this.emit('unsubscribe_likes', { postId });
  }
}
