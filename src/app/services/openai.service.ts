import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface TranslationResponse {
  translation: string;
  example?: string;
}

export interface TTSResponse {
  audioUrl: string;
  audioBlob: Blob;
}

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly ttsApiUrl = 'https://api.openai.com/v1/audio/speech';

  constructor(private http: HttpClient) {}

  /**
   * Translate a German word to English using OpenAI API
   */
  translateGermanWord(germanWord: string): Observable<TranslationResponse> {
    if (!environment.openaiApiKey) {
      return throwError(() => new Error('OpenAI API key not configured'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.openaiApiKey}`
    });

    const prompt = `Translate the German word "${germanWord}" to English. 
    Provide just the English translation. If it's a verb, include "to" prefix. 
    If helpful, add ONE simple example sentence in German with English translation in parentheses.
    
    Format your response as:
    Translation: [English translation]
    Example: [German sentence (English translation)] (only if helpful)
    
    Keep it concise and simple.`;

    const body = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    };

    return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
      map(response => this.parseTranslationResponse(response)),
      catchError(error => {
        console.error('OpenAI API error:', error);
        return throwError(() => new Error('Failed to translate word. Please try again.'));
      })
    );
  }

  /**
   * Generate German pronunciation using OpenAI Text-to-Speech API
   */
  generateGermanPronunciation(germanWord: string): Observable<TTSResponse> {
    if (!environment.openaiApiKey) {
      return throwError(() => new Error('OpenAI API key not configured'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.openaiApiKey}`
    });

    const body = {
      model: 'tts-1', // OpenAI's Text-to-Speech model
      input: germanWord,
      voice: 'nova', // Female voice, good for language learning
      response_format: 'mp3',
      speed: 0.8,
      instructions: "Speak in a cheerful and positive tone and not too fast. Emphasize the correct German pronunciation of the word.",
    };

    return this.http.post(this.ttsApiUrl, body, { 
      headers, 
      responseType: 'blob'
    }).pipe(
      map((audioBlob: any) => {
        // Create a URL for the audio blob
        const blob = audioBlob as Blob;
        const audioUrl = URL.createObjectURL(blob);
        return {
          audioUrl,
          audioBlob: blob
        };
      }),
      catchError(error => {
        console.error('OpenAI TTS API error:', error);
        return throwError(() => new Error('Failed to generate pronunciation. Please try again.'));
      })
    );
  }

  /**
   * Parse the OpenAI response to extract translation and example
   */
  private parseTranslationResponse(response: any): TranslationResponse {
    const content = response.choices?.[0]?.message?.content || '';
    
    // Extract translation
    const translationMatch = content.match(/Translation:\s*(.+?)(?:\n|$)/i);
    const translation = translationMatch?.[1]?.trim() || content.trim();
    
    // Extract example if present
    const exampleMatch = content.match(/Example:\s*(.+?)(?:\n|$)/i);
    const example = exampleMatch?.[1]?.trim();
    
    return {
      translation,
      example
    };
  }
}
