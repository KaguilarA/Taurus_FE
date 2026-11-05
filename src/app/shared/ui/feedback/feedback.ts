import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.html',
})
export class Feedback {
  public readonly error = input('');
  public readonly notice = input('');
}
