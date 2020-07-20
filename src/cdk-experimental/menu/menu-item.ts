/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Directive,
  Input,
  Optional,
  Self,
  ElementRef,
  Output,
  EventEmitter,
  Inject,
  HostListener,
} from '@angular/core';
import {coerceBooleanProperty, BooleanInput} from '@angular/cdk/coercion';
import {FocusableOption} from '@angular/cdk/a11y';
import {SPACE, ENTER, RIGHT_ARROW, LEFT_ARROW} from '@angular/cdk/keycodes';
import {Directionality} from '@angular/cdk/bidi';
import {CdkMenuItemTrigger} from './menu-item-trigger';
import {Menu, CDK_MENU} from './menu-interface';
import {FocusNext} from './menu-stack';

/**
 * Directive which provides the ability for an element to be focused and navigated to using the
 * keyboard when residing in a CdkMenu, CdkMenuBar, or CdkMenuGroup. It performs user defined
 * behavior when clicked.
 */
@Directive({
  selector: '[cdkMenuItem]',
  exportAs: 'cdkMenuItem',
  host: {
    'tabindex': '-1',
    'type': 'button',
    'role': 'menuitem',
    '[attr.aria-disabled]': 'disabled || null',
  },
})
export class CdkMenuItem implements FocusableOption {
  /**  Whether the CdkMenuItem is disabled - defaults to false */
  @Input()
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = coerceBooleanProperty(value);
  }
  private _disabled = false;

  /**
   * If this MenuItem is a regular MenuItem, outputs when it is triggered by a keyboard or mouse
   * event.
   */
  @Output('cdkMenuItemTriggered') triggered: EventEmitter<void> = new EventEmitter();

  constructor(
    private readonly _elementRef: ElementRef<HTMLElement>,
    @Inject(CDK_MENU) private readonly _parentMenu: Menu,
    @Optional() private readonly _dir?: Directionality,
    /** Reference to the CdkMenuItemTrigger directive if one is added to the same element */
    @Self() @Optional() private readonly _menuTrigger?: CdkMenuItemTrigger
  ) {}

  /** Place focus on the element. */
  focus() {
    this._elementRef.nativeElement.focus();
  }

  /**
   * If the menu item is not disabled and the element does not have a menu trigger attached, emit
   * on the cdkMenuItemTriggered emitter and close all open menus.
   */
  trigger() {
    if (!this.disabled && !this.hasMenu()) {
      this.triggered.next();
      this._getMenuStack().closeAll();
    }
  }

  /** Whether the menu item opens a menu. */
  hasMenu() {
    return !!this._menuTrigger?.hasMenu();
  }

  /** Return true if this MenuItem has an attached menu and it is open. */
  isMenuOpen() {
    return !!this._menuTrigger?.isMenuOpen();
  }

  /**
   * Get a reference to the rendered Menu if the Menu is open and it is visible in the DOM.
   * @return the menu if it is open, otherwise undefined.
   */
  getMenu(): Menu | undefined {
    return this._menuTrigger?.getMenu();
  }

  /** Get the MenuItemTrigger associated with this element. */
  getMenuTrigger(): CdkMenuItemTrigger | undefined {
    return this._menuTrigger;
  }

  /** Get the label for this element which is required by the FocusableOption interface. */
  getLabel(): string {
    // TODO(andy): implement a more robust algorithm for determining nested text
    return this._elementRef.nativeElement.textContent || '';
  }

  // In Ivy the `host` metadata will be merged, whereas in ViewEngine it is overridden. In order
  // to avoid double event listeners, we need to use `HostListener`. Once Ivy is the default, we
  // can move this back into `host`.
  // tslint:disable:no-host-decorator-in-concrete
  @HostListener('keydown', ['$event'])
  /**
   * Handles keyboard events for the menu item, specifically either triggering the user defined
   * callback or opening/closing the current menu based on whether the left or right arrow key was
   * pressed.
   * @param event the keyboard event to handle
   */
  _onKeydown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case SPACE:
      case ENTER:
        event.preventDefault();
        this.trigger();
        break;

      case RIGHT_ARROW:
        if (this._isParentVertical() && !this.hasMenu()) {
          event.preventDefault();
          this._dir?.value === 'rtl'
            ? this._getMenuStack().closeLatest(FocusNext.previousItem)
            : this._getMenuStack().closeAll(FocusNext.nextItem);
        }
        break;

      case LEFT_ARROW:
        if (this._isParentVertical() && !this.hasMenu()) {
          event.preventDefault();
          this._dir?.value === 'rtl'
            ? this._getMenuStack().closeAll(FocusNext.nextItem)
            : this._getMenuStack().closeLatest(FocusNext.previousItem);
        }
        break;
    }
  }

  /** Return true if the enclosing parent menu is configured in a horizontal orientation. */
  private _isParentVertical() {
    return this._parentMenu.orientation === 'vertical';
  }

  /** Get the MenuStack from the parent menu. */
  private _getMenuStack() {
    // We use a function since at the construction of the MenuItemTrigger the parent Menu won't have
    // its menu stack set. Therefore we need to reference the menu stack from the parent each time
    // we want to use it.
    return this._parentMenu._menuStack;
  }

  static ngAcceptInputType_disabled: BooleanInput;
}
