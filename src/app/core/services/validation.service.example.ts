/**
 * EJEMPLOS DE USO DEL SERVICIO DE VALIDACIONES
 * 
 * Este archivo muestra cómo usar el ValidationService en tus componentes.
 * NO es un archivo funcional, solo contiene ejemplos de código.
 */

import { Component, inject } from '@angular/core';
import { ValidationService } from './validation.service';

// ============================================
// EJEMPLO 1: Inyectar el servicio en un componente
// ============================================
export class EjemploComponente {
  // Opción 1: Inyección en el constructor
  constructor(private validationService: ValidationService) {}

  // Opción 2: Inyección con inject() (Angular 14+)
  private validationService2 = inject(ValidationService);

  validarDatos() {
    // Validar cédula
    const cedula = '1234567890';
    if (this.validationService.validarCedula(cedula)) {
      console.log('Cédula válida');
    }

    // Validar email
    const email = 'usuario@example.com';
    if (this.validationService.validarEmail(email)) {
      console.log('Email válido');
    }

    // Validar fecha
    const fecha = '2020-01-15';
    if (this.validationService.validarFechaValida(fecha)) {
      console.log('Fecha válida');
    }

    // Validar edad mínima
    const fechaNacimiento = '2010-01-15';
    if (this.validationService.validarEdadMinima(fechaNacimiento, 18)) {
      console.log('Es mayor de edad');
    }

    // Validar campos requeridos
    const datos = {
      'Nombre': 'Juan',
      'Email': 'juan@example.com',
      'Teléfono': ''
    };
    const camposVacios = this.validationService.validarCamposRequeridos(datos);
    if (camposVacios.length > 0) {
      console.log('Campos vacíos:', camposVacios);
    }

    // Validar contraseña
    const password = 'MiPassword123!';
    const resultadoPassword = this.validationService.validarPassword(
      password,
      8,              // longitud mínima
      true,           // requiere mayúscula
      true,           // requiere minúscula
      true,           // requiere número
      true            // requiere carácter especial
    );
    if (!resultadoPassword.valido) {
      console.log('Errores de contraseña:', resultadoPassword.errores);
    }

    // Validar teléfono
    const telefono = '0991234567';
    if (this.validationService.validarTelefono(telefono, 7, 15)) {
      console.log('Teléfono válido');
    }

    // Validar longitud de texto
    const texto = 'Hola mundo';
    if (this.validationService.validarLongitudTexto(texto, 5, 50)) {
      console.log('Texto válido');
    }

    // Validar solo letras
    const nombre = 'Juan Pérez';
    if (this.validationService.validarSoloLetras(nombre)) {
      console.log('Nombre válido (solo letras)');
    }

    // Validar solo números
    const numero = '12345';
    if (this.validationService.validarSoloNumeros(numero)) {
      console.log('Número válido');
    }

    // Validar rango numérico
    const edad = 25;
    if (this.validationService.validarRango(edad, 18, 100)) {
      console.log('Edad válida');
    }

    // Validar URL
    const url = 'https://www.example.com';
    if (this.validationService.validarURL(url)) {
      console.log('URL válida');
    }

    // Validar número de tarjeta
    const tarjeta = '4532015112830366';
    if (this.validationService.validarNumeroTarjeta(tarjeta)) {
      console.log('Número de tarjeta válido');
    }
  }
}

// ============================================
// EJEMPLO 2: Uso en un formulario
// ============================================
export class EjemploFormulario {
  private validationService = inject(ValidationService);

  datos = {
    cedula: '',
    nombres: '',
    email: '',
    telefono: '',
    fechaNacimiento: ''
  };

  validarFormulario(): boolean {
    // Validar cédula
    if (!this.validationService.validarCedula(this.datos.cedula)) {
      alert('La cédula debe tener 10 dígitos');
      return false;
    }

    // Validar campos requeridos
    const camposRequeridos = {
      'Cédula': this.datos.cedula,
      'Nombres': this.datos.nombres,
      'Teléfono': this.datos.telefono
    };
    const camposVacios = this.validationService.validarCamposRequeridos(camposRequeridos);
    if (camposVacios.length > 0) {
      alert(`Los siguientes campos son requeridos: ${camposVacios.join(', ')}`);
      return false;
    }

    // Validar email si está presente
    if (this.datos.email && !this.validationService.validarEmail(this.datos.email)) {
      alert('El email no tiene un formato válido');
      return false;
    }

    // Validar fecha de nacimiento
    if (!this.validationService.validarFechaValida(this.datos.fechaNacimiento)) {
      alert('La fecha de nacimiento no es válida');
      return false;
    }

    // Validar edad mínima
    if (!this.validationService.validarEdadMinima(this.datos.fechaNacimiento, 18)) {
      alert('Debe ser mayor de 18 años');
      return false;
    }

    // Validar teléfono
    if (!this.validationService.validarTelefono(this.datos.telefono)) {
      alert('El teléfono no es válido');
      return false;
    }

    return true;
  }
}

// ============================================
// EJEMPLO 3: Validación personalizada combinando métodos
// ============================================
export class EjemploValidacionPersonalizada {
  private validationService = inject(ValidationService);

  validarCliente(cliente: any): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar cédula
    if (!this.validationService.validarCedula(cliente.cedula)) {
      errores.push('La cédula debe tener exactamente 10 dígitos numéricos');
    }

    // Validar nombres (solo letras)
    if (!this.validationService.validarSoloLetras(cliente.nombres)) {
      errores.push('Los nombres solo pueden contener letras');
    }

    // Validar longitud de nombres
    if (!this.validationService.validarLongitudTexto(cliente.nombres, 2, 50)) {
      errores.push('Los nombres deben tener entre 2 y 50 caracteres');
    }

    // Validar email si está presente
    if (cliente.email && !this.validationService.validarEmail(cliente.email)) {
      errores.push('El email no tiene un formato válido');
    }

    // Validar fecha de nacimiento
    if (!this.validationService.validarFechaValida(cliente.fechaNacimiento)) {
      errores.push('La fecha de nacimiento no es válida');
    } else if (!this.validationService.validarEdadMinima(cliente.fechaNacimiento, 18)) {
      errores.push('El cliente debe ser mayor de 18 años');
    }

    // Validar teléfono
    if (!this.validationService.validarTelefono(cliente.telefono, 7, 15)) {
      errores.push('El teléfono debe tener entre 7 y 15 dígitos');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }
}

