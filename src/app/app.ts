import { Component, ElementRef, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { type RawTransaction } from '../xls/xls-processor';
import {
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTextColumn,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { lazyLoadXlsProcessor } from '../xls/lazy-xls';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [
    MatTable,
    MatTextColumn,
    MatHeaderRowDef,
    MatRowDef,
    MatHeaderRow,
    MatRow,
    MatButton,
    MatIcon,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly #processor = isPlatformBrowser(inject(PLATFORM_ID)) ? lazyLoadXlsProcessor() : null;

  protected readonly errors = signal('');
  protected readonly transactions = signal<RawTransaction[] | null>(null);
  protected readonly link = signal<string | null>(null);
  protected readonly fileName = signal<string | null>(null);
  protected readonly fileInput = viewChild.required<string, ElementRef<HTMLInputElement>>(
    'fileInput',
    {
      read: ElementRef,
    },
  );

  protected readonly tableColumns: readonly (keyof RawTransaction | 'memo')[] = [
    'date',
    'amount',
    'memo',
    'payee',
  ];

  onChange() {
    this.#processFile();
  }

  protected getBlankMemo() {
    return '';
  }

  #processFile() {
    const file = this.fileInput().nativeElement.files?.item(0);
    this.fileName.set(file?.name ?? null);
    if (file != null) {
      this.#processor
        ?.then((processor) => processor.process(file))
        .then(({ csv, transactions, errors }) => {
          this.errors.set(errors.join('\n'));
          this.transactions.set(transactions);
          if (csv != null) {
            this.link.set(URL.createObjectURL(csv));
          } else {
            this.link.set(null);
          }
        });
    }
  }
}
