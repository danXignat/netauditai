import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';

import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { HttpClientModule } from '@angular/common/http';

import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { IconDefinition } from '@ant-design/icons-angular';
import {
  UserOutline,
  LockOutline,
  MailOutline,
  LogoutOutline,
  SettingOutline,
  DownOutline,
  PlusOutline,
  EditOutline,
  DeleteOutline,
  GithubOutline,
  LinkOutline,
  InboxOutline,
  GlobalOutline,
  SearchOutline,
  UpOutline,
  SwapOutline,
  SendOutline,
  RobotOutline,
  SaveOutline
} from '@ant-design/icons-angular/icons';
import {NzRadioModule} from 'ng-zorro-antd/radio';

registerLocaleData(en);

const icons: IconDefinition[] = [
  UserOutline,
  LockOutline,
  MailOutline,
  LogoutOutline,
  SettingOutline,
  DownOutline,
  PlusOutline,
  EditOutline,
  DeleteOutline,
  GithubOutline,
  LinkOutline,
  InboxOutline,
  GlobalOutline,
  SearchOutline,
  UpOutline,
  SwapOutline,
  SendOutline,
  RobotOutline,
  SaveOutline
];

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    HttpClientModule,

    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    AppRoutingModule,

    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzMessageModule,
    NzDividerModule,
    NzLayoutModule,
    NzAvatarModule,
    NzDropDownModule,
    NzMenuModule,
    NzIconModule.forRoot(icons),
    NzStatisticModule,
    NzListModule,
    NzSpinModule,
    NzTableModule,
    NzModalModule,
    NzDatePickerModule,
    NzPopconfirmModule,
    NzToolTipModule,
    NzRadioModule
  ],
  providers: [
    { provide: NZ_I18N, useValue: en_US }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
