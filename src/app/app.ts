import {Component, ElementRef, inject, signal, viewChild} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {type RawTransaction, XlsProcessor} from './xls-processor';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  readonly #processor = inject(XlsProcessor);

  protected readonly errors = signal('');
  protected readonly transactions = signal<RawTransaction[]|null>(null);
  protected readonly link = signal<string|null>(null);
  protected readonly fileInput = viewChild.required<string, ElementRef<HTMLInputElement>>('fileInput', {
    read: ElementRef
  });

  onChange() {
    this.#processFile();
  }

  submit() {
    this.#processFile();
  }

  #processFile() {
    const file = this.fileInput().nativeElement.files?.item(0);
    if (file != null) {
      this.#processor.process(file).then(({csv, transactions, errors}) => {
        this.errors.set(errors.join('\n'));
        this.transactions.set(transactions)
        if (csv != null) {
          this.link.set(URL.createObjectURL(csv));
        } else {
          this.link.set(null);
        }
      })
    }
  }

}
