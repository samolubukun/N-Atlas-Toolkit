import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sendToNATLaS from './providers/natlas.provider';
import { ChatMessage } from './interfaces/chat-message.interface';

@Injectable()
export class ChatService {
  async sendMessage(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await sendToNATLaS(messages);
      return response.data.choices[0].message.content;
    } catch (err: any) {
      const detail = err?.response?.data || err.message;
      console.error('N-ATLaS Chat API error:', detail);
      throw new InternalServerErrorException(
        typeof detail === 'string' ? detail : 'Failed to get a response from N-ATLaS model.',
      );
    }
  }
}
