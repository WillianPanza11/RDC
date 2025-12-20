export * from './autenticacin.service';
import { AutenticacinService } from './autenticacin.service';
export * from './clienteController.service';
import { ClienteControllerService } from './clienteController.service';
export * from './cuentasDeAhorro.service';
import { CuentasDeAhorroService } from './cuentasDeAhorro.service';
export * from './transaccionesDeAhorro.service';
import { TransaccionesDeAhorroService } from './transaccionesDeAhorro.service';
export const APIS = [AutenticacinService, ClienteControllerService, CuentasDeAhorroService, TransaccionesDeAhorroService];
