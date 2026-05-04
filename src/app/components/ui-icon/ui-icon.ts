import { Component, input } from '@angular/core';
import { IconName } from '../../core/social.models';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      flex: 0 0 auto;
    }

    svg {
      display: block;
      transition: transform var(--transition-base), color var(--transition-base), opacity var(--transition-base);
    }
  `],
  template: `
    <svg
      viewBox="0 0 24 24"
      [attr.fill]="filled() && name() === 'heart' ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.stroke-width]="strokeWidth()"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('camera') {
          <path d="M4.5 7.5h3l1.6-2h5.8l1.6 2h3A2.5 2.5 0 0 1 22 10v8a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18V10a2.5 2.5 0 0 1 2.5-2.5z"></path>
          <circle cx="12" cy="14" r="4"></circle>
        }
        @case ('back') {
          <path d="m15 18-6-6 6-6"></path>
        }
        @case ('grid') {
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"></rect>
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"></rect>
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"></rect>
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"></rect>
        }
        @case ('reels') {
          <rect x="5" y="3.5" width="14" height="17" rx="3"></rect>
          <path d="m5 8 14-4"></path>
          <path d="m9 3.5 4 4"></path>
          <path d="m14 3.5 4 4"></path>
        }
        @case ('dots') {
          <circle cx="6" cy="12" r="1.5"></circle>
          <circle cx="12" cy="12" r="1.5"></circle>
          <circle cx="18" cy="12" r="1.5"></circle>
        }
        @case ('plus-square') {
          <rect x="3.5" y="3.5" width="17" height="17" rx="4"></rect>
          <path d="M12 8v8"></path>
          <path d="M8 12h8"></path>
        }
        @case ('home') {
          <path d="M3 10.5 12 3l9 7.5"></path>
          <path d="M5 9.5V21h14V9.5"></path>
        }
        @case ('explore') {
          <circle cx="12" cy="12" r="8"></circle>
          <path d="m10.5 13.5 5.5-5.5-2 6-6 2 2.5-2.5"></path>
        }
        @case ('messages') {
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H17a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H11l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"></path>
        }
        @case ('message-circle') {
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5V8a1.5 1.5 0 0 1 1-1.5"></path>
        }
        @case ('notifications') {
          <path d="M15 17H5.5A1.5 1.5 0 0 1 4 15.5V11a7 7 0 1 1 14 0v4.5A1.5 1.5 0 0 1 16.5 17H15"></path>
          <path d="M10 20a2 2 0 0 0 4 0"></path>
        }
        @case ('profile') {
          <circle cx="12" cy="8" r="4"></circle>
          <path d="M5 20a7 7 0 0 1 14 0"></path>
        }
        @case ('spark') {
          <path d="m12 3 1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3z"></path>
          <path d="m18.5 15 .9 2.2 2.1.9-2.1.9-.9 2.2-.9-2.2-2.1-.9 2.1-.9z"></path>
        }
        @case ('search') {
          <circle cx="11" cy="11" r="6"></circle>
          <path d="m20 20-3.5-3.5"></path>
        }
        @case ('menu') {
          <path d="M4 7h16"></path>
          <path d="M4 12h16"></path>
          <path d="M4 17h16"></path>
        }
        @case ('close') {
          <path d="m6 6 12 12"></path>
          <path d="M18 6 6 18"></path>
        }
        @case ('heart') {
          <path d="m12 20-1.3-1.2C5.2 13.8 2 10.9 2 7.4 2 4.8 4 3 6.5 3c1.8 0 3.4.9 4.5 2.3C12.1 3.9 13.7 3 15.5 3 18 3 20 4.8 20 7.4c0 3.5-3.2 6.4-8.7 11.4z"></path>
        }
        @case ('comment') {
          <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"></path>
        }
        @case ('share') {
          <path d="m14 5 7 7-7 7"></path>
          <path d="M21 12H9a5 5 0 0 0-5 5v2"></path>
        }
        @case ('bookmark') {
          <path d="M7 4h10a1 1 0 0 1 1 1v16l-6-4-6 4V5a1 1 0 0 1 1-1z"></path>
        }
        @case ('image') {
          <rect x="3" y="5" width="18" height="14" rx="3"></rect>
          <circle cx="9" cy="10" r="1.4"></circle>
          <path d="m21 15-4.5-4.5L8 19"></path>
        }
        @case ('google') {
          <path d="M20.5 12.2c0-.6-.1-1.2-.2-1.7H12v3.2h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.8 2.6-6.4Z"></path>
          <path d="M12 21c2.4 0 4.5-.8 5.9-2.3l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.2-1.5-4.9-3.6H4v2.3A9 9 0 0 0 12 21Z"></path>
          <path d="M7.1 13.8a5.4 5.4 0 0 1 0-3.6V7.9H4A9 9 0 0 0 4 16l3.1-2.2Z"></path>
          <path d="M12 6.6c1.3 0 2.4.5 3.3 1.3l2.5-2.5A9 9 0 0 0 4 7.9l3.1 2.3C7.8 8.1 9.7 6.6 12 6.6Z"></path>
        }
        @case ('github') {
          <path d="M9 19c-4 .8-4-2-5.7-2.5"></path>
          <path d="M15 21v-3.4a3 3 0 0 0-.8-2.2c2.7-.3 5.6-1.3 5.6-6A4.7 4.7 0 0 0 18.5 6a4.4 4.4 0 0 0-.1-3.1s-1-.3-3.3 1.3a11.5 11.5 0 0 0-6 0C6.8 2.6 5.8 2.9 5.8 2.9A4.4 4.4 0 0 0 5.7 6a4.7 4.7 0 0 0-1.3 3.4c0 4.7 2.9 5.7 5.6 6a3 3 0 0 0-.8 2.2V21"></path>
        }
        @case ('plus') {
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        }
        @case ('logout') {
          <path d="M14 6V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"></path>
          <path d="M10 12h11"></path>
          <path d="m18 7 5 5-5 5"></path>
        }
        @case ('chevron-right') {
          <path d="m9 6 6 6-6 6"></path>
        }
        @case ('send') {
          <path d="M22 2 11 13"></path>
          <path d="m22 2-7 20-4-9-9-4z"></path>
        }
        @case ('bell') {
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"></path>
          <path d="M10 21a2 2 0 0 0 4 0"></path>
        }
        @case ('spinner') {
          <path d="M12 4a8 8 0 1 1-7.4 4.9"></path>
        }
      }
    </svg>
  `,
})
export class UiIconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  readonly strokeWidth = input(1.7);
  readonly filled = input(false);
}
