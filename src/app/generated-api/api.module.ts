import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { Configuration } from './configuration';
import { HttpClient } from '@angular/common/http';


import { AutenticacinService } from './api/autenticacin.service';
import { ClienteControllerService } from './api/clienteController.service';
import { CuentasDeAhorroService } from './api/cuentasDeAhorro.service';
import { TransaccionesDeAhorroService } from './api/transaccionesDeAhorro.service';

@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: [
    AutenticacinService,
    ClienteControllerService,
    CuentasDeAhorroService,
    TransaccionesDeAhorroService ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders<ApiModule> {
        return {
            ngModule: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    constructor( @Optional() @SkipSelf() parentModule: ApiModule,
                 @Optional() http: HttpClient) {
        if (parentModule) {
            throw new Error('ApiModule is already loaded. Import in your base AppModule only.');
        }
        if (!http) {
            throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
            'See also https://github.com/angular/angular/issues/20575');
        }
    }
}
