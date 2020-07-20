import {ComponentFixture, TestBed, async} from '@angular/core/testing';
import {Component, ViewChild} from '@angular/core';
import {By} from '@angular/platform-browser';
import {CdkMenu} from './menu';
import {CdkMenuModule} from './menu-module';
import {CdkMenuItemCheckbox} from './menu-item-checkbox';
import {CdkMenuItem} from './menu-item';
import {CdkMenuPanel} from './menu-panel';
import {MenuStack} from './menu-stack';

describe('Menu', () => {
  describe('as checkbox group', () => {
    let fixture: ComponentFixture<MenuCheckboxGroup>;
    let menuItems: CdkMenuItemCheckbox[];

    beforeEach(async(() => {
      TestBed.configureTestingModule({
        imports: [CdkMenuModule],
        declarations: [MenuCheckboxGroup],
      }).compileComponents();

      fixture = TestBed.createComponent(MenuCheckboxGroup);
      fixture.detectChanges();

      fixture.componentInstance.panel._menuStack = new MenuStack();
      fixture.componentInstance.trigger.getMenuTrigger()?.toggle();
      fixture.detectChanges();

      menuItems = fixture.debugElement
        .queryAll(By.directive(CdkMenuItemCheckbox))
        .map(element => element.injector.get(CdkMenuItemCheckbox));
    }));

    it('should toggle menuitemcheckbox', () => {
      expect(menuItems[0].checked).toBeTrue();
      expect(menuItems[1].checked).toBeFalse();

      menuItems[1].trigger();
      expect(menuItems[0].checked).toBeTrue(); // checkbox should not change

      menuItems[0].trigger();

      expect(menuItems[0].checked).toBeFalse();
      expect(menuItems[1].checked).toBeTrue();
    });
  });

  describe('checkbox change events', () => {
    let fixture: ComponentFixture<MenuCheckboxGroup>;
    let menuItems: CdkMenuItemCheckbox[];

    beforeEach(async(() => {
      TestBed.configureTestingModule({
        imports: [CdkMenuModule],
        declarations: [MenuCheckboxGroup],
      }).compileComponents();

      fixture = TestBed.createComponent(MenuCheckboxGroup);
      fixture.detectChanges();

      fixture.componentInstance.panel._menuStack = new MenuStack();
      fixture.componentInstance.trigger.getMenuTrigger()?.toggle();
      fixture.detectChanges();

      menuItems = fixture.debugElement
        .queryAll(By.directive(CdkMenuItemCheckbox))
        .map(element => element.injector.get(CdkMenuItemCheckbox));
    }));

    it('should emit on click', () => {
      const spy = jasmine.createSpy('cdkMenu change spy');
      fixture.debugElement.query(By.directive(CdkMenu)).injector.get(CdkMenu).change.subscribe(spy);

      menuItems[0].trigger();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(menuItems[0]);
    });
  });

  describe('with inner group', () => {
    let fixture: ComponentFixture<MenuWithNestedGroup>;
    let menuItems: CdkMenuItemCheckbox[];
    let menu: CdkMenu;

    beforeEach(async(() => {
      TestBed.configureTestingModule({
        imports: [CdkMenuModule],
        declarations: [MenuWithNestedGroup],
      }).compileComponents();

      fixture = TestBed.createComponent(MenuWithNestedGroup);
      fixture.detectChanges();

      fixture.componentInstance.panel._menuStack = new MenuStack();
      fixture.componentInstance.trigger.getMenuTrigger()?.toggle();
      fixture.detectChanges();

      menu = fixture.debugElement.query(By.directive(CdkMenu)).injector.get(CdkMenu);

      menuItems = fixture.debugElement
        .queryAll(By.directive(CdkMenuItemCheckbox))
        .map(element => element.injector.get(CdkMenuItemCheckbox));
    }));

    it('should not emit change from root menu ', () => {
      const spy = jasmine.createSpy('changeSpy for root menu');
      menu.change.subscribe(spy);

      for (let menuItem of menuItems) {
        menuItem.trigger();
      }

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('with inner group render delayed', () => {
    let fixture: ComponentFixture<MenuWithConditionalGroup>;
    let menuItems: CdkMenuItemCheckbox[];
    let menu: CdkMenu;

    const getMenuItems = () => {
      return fixture.debugElement
        .queryAll(By.directive(CdkMenuItemCheckbox))
        .map(element => element.injector.get(CdkMenuItemCheckbox));
    };

    beforeEach(async(() => {
      TestBed.configureTestingModule({
        imports: [CdkMenuModule],
        declarations: [MenuWithConditionalGroup],
      }).compileComponents();

      fixture = TestBed.createComponent(MenuWithConditionalGroup);
      fixture.detectChanges();

      fixture.componentInstance.panel._menuStack = new MenuStack();
      fixture.componentInstance.trigger.getMenuTrigger()?.toggle();
      fixture.detectChanges();

      menu = fixture.debugElement.query(By.directive(CdkMenu)).injector.get(CdkMenu);
      menuItems = getMenuItems();
    }));

    it('should not emit after the menu group element renders', () => {
      const spy = jasmine.createSpy('cdkMenu change');
      menu.change.subscribe(spy);

      menuItems[0].trigger();
      fixture.componentInstance.renderInnerGroup = true;
      fixture.detectChanges();

      menuItems = getMenuItems();
      menuItems[1].trigger();
      fixture.detectChanges();

      expect(spy).withContext('Expected initial trigger only').toHaveBeenCalledTimes(1);
    });
  });
});

@Component({
  template: `
    <div cdkMenuBar>
      <button cdkMenuItem [cdkMenuTriggerFor]="panel"></button>
    </div>
    <ng-template cdkMenuPanel #panel="cdkMenuPanel">
      <ul cdkMenu [cdkMenuPanel]="panel">
        <li role="none">
          <button checked="true" cdkMenuItemCheckbox>
            first
          </button>
        </li>
        <li role="none">
          <button cdkMenuItemCheckbox>
            second
          </button>
        </li>
      </ul>
    </ng-template>
  `,
})
class MenuCheckboxGroup {
  @ViewChild(CdkMenuItem) readonly trigger: CdkMenuItem;
  @ViewChild(CdkMenuPanel) readonly panel: CdkMenuPanel;
}

@Component({
  template: `
    <div cdkMenuBar>
      <button cdkMenuItem [cdkMenuTriggerFor]="panel"></button>
    </div>
    <ng-template cdkMenuPanel #panel="cdkMenuPanel">
      <ul cdkMenu [cdkMenuPanel]="panel">
        <li>
          <ul cdkMenuGroup>
            <li><button cdkMenuCheckbox>first</button></li>
          </ul>
        </li>
      </ul>
    </ng-template>
  `,
})
class MenuWithNestedGroup {
  @ViewChild(CdkMenuItem) readonly trigger: CdkMenuItem;
  @ViewChild(CdkMenuPanel) readonly panel: CdkMenuPanel;
}

@Component({
  template: `
    <div cdkMenuBar>
      <button cdkMenuItem [cdkMenuTriggerFor]="panel"></button>
    </div>
    <ng-template cdkMenuPanel #panel="cdkMenuPanel">
      <ul cdkMenu [cdkMenuPanel]="panel">
        <li><button cdkMenuItemCheckbox>first</button></li>
        <div *ngIf="renderInnerGroup">
          <ul cdkMenuGroup>
            <li><button cdkMenuItemCheckbox>second</button></li>
          </ul>
        </div>
      </ul>
    </ng-template>
  `,
})
class MenuWithConditionalGroup {
  renderInnerGroup = false;
  @ViewChild(CdkMenuItem) readonly trigger: CdkMenuItem;
  @ViewChild(CdkMenuPanel) readonly panel: CdkMenuPanel;
}
