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
  ContentChildren,
  QueryList,
  AfterContentInit,
  OnDestroy,
  Optional,
} from '@angular/core';
import {Directionality} from '@angular/cdk/bidi';
import {FocusKeyManager, FocusOrigin} from '@angular/cdk/a11y';
import {LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW, ESCAPE, TAB} from '@angular/cdk/keycodes';
import {CdkMenuGroup} from './menu-group';
import {CDK_MENU, Menu} from './menu-interface';
import {CdkMenuItem} from './menu-item';
import {MenuStack, MenuStackItem, FocusNext} from './menu-stack';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

/**
 * Directive applied to an element which configures it as a MenuBar by setting the appropriate
 * role, aria attributes, and accessible keyboard and mouse handling logic. The component that
 * this directive is applied to should contain components marked with CdkMenuItem.
 *
 */
@Directive({
  selector: '[cdkMenuBar]',
  exportAs: 'cdkMenuBar',
  host: {
    '(keydown)': '_handleKeyEvent($event)',
    '(focus)': 'focusFirstItem()',
    'role': 'menubar',
    'tabindex': '0',
    '[attr.aria-orientation]': 'orientation',
  },
  providers: [
    {provide: CdkMenuGroup, useExisting: CdkMenuBar},
    {provide: CDK_MENU, useExisting: CdkMenuBar},
    {provide: MenuStack, useClass: MenuStack},
  ],
})
export class CdkMenuBar extends CdkMenuGroup implements Menu, AfterContentInit, OnDestroy {
  /**
   * Sets the aria-orientation attribute and determines where menus will be opened.
   * Does not affect styling/layout.
   */
  @Input('cdkMenuBarOrientation') orientation: 'horizontal' | 'vertical' = 'horizontal';

  /** Handles keyboard events for the MenuBar. */
  private _keyManager: FocusKeyManager<CdkMenuItem>;

  /** Emits when the MenuBar is destroyed. */
  private readonly _destroyed: Subject<void> = new Subject();

  /** All child MenuItem elements nested in this MenuBar. */
  @ContentChildren(CdkMenuItem, {descendants: true})
  private readonly _allItems: QueryList<CdkMenuItem>;

  constructor(readonly _menuStack: MenuStack, @Optional() private readonly _dir?: Directionality) {
    super();
  }

  ngAfterContentInit() {
    super.ngAfterContentInit();

    this._setKeyManager();
    this._subscribeToMenuStack();
  }

  /** Place focus on the first MenuItem in the menu and set the focus origin. */
  focusFirstItem(focusOrigin: FocusOrigin = 'program') {
    this._keyManager.setFocusOrigin(focusOrigin);
    this._keyManager.setFirstItemActive();
  }

  /** Place focus on the last MenuItem in the menu and set the focus origin. */
  focusLastItem(focusOrigin: FocusOrigin = 'program') {
    this._keyManager.setFocusOrigin(focusOrigin);
    this._keyManager.setLastItemActive();
  }

  /**
   * Handle keyboard events, specifically changing the focused element and/or toggling the active
   * items menu.
   * @param event the KeyboardEvent to handle.
   */
  _handleKeyEvent(event: KeyboardEvent) {
    const keyManager = this._keyManager;
    switch (event.keyCode) {
      case UP_ARROW:
      case DOWN_ARROW:
      case LEFT_ARROW:
      case RIGHT_ARROW:
        const horizontalArrows = event.keyCode === LEFT_ARROW || event.keyCode === RIGHT_ARROW;
        // For a horizontal menu if the left/right keys were clicked, or a vertical menu if the
        // up/down keys were clicked: if the current menu is open, close it then focus and open the
        // next  menu.
        if (
          (this._isHorizontal() && horizontalArrows) ||
          (!this._isHorizontal() && !horizontalArrows)
        ) {
          event.preventDefault();

          const prevIsOpen = keyManager.activeItem?.isMenuOpen();
          keyManager.activeItem?.getMenuTrigger()?.closeMenu();

          keyManager.setFocusOrigin('keyboard');
          keyManager.onKeydown(event);
          if (prevIsOpen) {
            keyManager.activeItem?.getMenuTrigger()?.openMenu();
          }
        }
        break;

      case ESCAPE:
        event.preventDefault();
        keyManager.activeItem?.getMenuTrigger()?.closeMenu();
        break;

      case TAB:
        keyManager.activeItem?.getMenuTrigger()?.closeMenu();
        break;

      default:
        keyManager.onKeydown(event);
    }
  }

  /** Setup the FocusKeyManager with the correct orientation for the menu bar. */
  private _setKeyManager() {
    this._keyManager = new FocusKeyManager(this._allItems)
      .withWrap()
      .withTypeAhead()
      .withHomeAndEnd();

    if (this._isHorizontal()) {
      this._keyManager.withHorizontalOrientation(this._dir?.value || 'ltr');
    } else {
      this._keyManager.withVerticalOrientation();
    }
  }

  /** Subscribe to the MenuStack close and empty observables. */
  private _subscribeToMenuStack() {
    this._menuStack.close
      .pipe(takeUntil(this._destroyed))
      .subscribe((item: MenuStackItem) => this._closeOpenMenu(item));

    this._menuStack.empty
      .pipe(takeUntil(this._destroyed))
      .subscribe((event: FocusNext) => this._toggleOpenMenu(event));
  }

  /**
   * Close the open menu if the current active item opened the requested MenuStackItem.
   * @param item the MenuStackItem requested to be closed.
   */
  private _closeOpenMenu(item: MenuStackItem) {
    const keyManager = this._keyManager;
    if (item === keyManager.activeItem?.getMenu()) {
      keyManager.activeItem.getMenuTrigger()?.closeMenu();
      keyManager.setFocusOrigin('keyboard');
      keyManager.setActiveItem(keyManager.activeItem);
    }
  }

  /**
   * Set focus to either the current, previous or next item based on the FocusNext event, then
   * open the previous or next item.
   */
  private _toggleOpenMenu(event: FocusNext) {
    const keyManager = this._keyManager;
    switch (event) {
      case FocusNext.nextItem:
        keyManager.setFocusOrigin('keyboard');
        keyManager.setNextItemActive();
        keyManager.activeItem?.getMenuTrigger()?.openMenu();
        break;

      case FocusNext.previousItem:
        keyManager.setFocusOrigin('keyboard');
        keyManager.setPreviousItemActive();
        keyManager.activeItem?.getMenuTrigger()?.openMenu();
        break;

      case FocusNext.currentItem:
        if (keyManager.activeItem) {
          keyManager.setFocusOrigin('keyboard');
          keyManager.setActiveItem(keyManager.activeItem);
        }
        break;
    }
  }

  /**
   * @return true if the menu bar is configured to be horizontal.
   */
  private _isHorizontal() {
    return this.orientation === 'horizontal';
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._destroyed.next();
    this._destroyed.complete();
  }
}
