import {Injectable} from '@angular/core';

function _getWindow(): any {
  return <any>window;
}

export interface WindowPerformanceTest extends Window {
  _totalPerformanceTime: number;
}


@Injectable()

export class WindowRefService {
  static get nativeWindow() {
    return <WindowPerformanceTest>_getWindow();
  }
}
