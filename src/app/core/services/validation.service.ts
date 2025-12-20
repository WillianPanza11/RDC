import { Injectable } from '@angular/core';

/**
 * Servicio de validaciones reutilizable
 * Proporciona métodos estáticos y de instancia para validar diferentes tipos de datos
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  constructor() { }

  /**
   * Valida si una cédula tiene el formato correcto (10 dígitos numéricos)
   * @param cedula - Número de cédula a validar
   * @returns true si la cédula es válida, false en caso contrario
   */
  validarCedula(cedula: string): boolean {
    if (!cedula) {
      return false;
    }
    const cedulaRegex = /^\d{10}$/;
    return cedulaRegex.test(cedula.trim());
  }

  /**
   * Valida si un email tiene el formato correcto
   * @param email - Email a validar
   * @returns true si el email es válido, false en caso contrario
   */
  validarEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valida si una fecha tiene el formato correcto (YYYY-MM-DD)
   * @param fecha - Fecha a validar en formato string
   * @returns true si la fecha tiene el formato correcto, false en caso contrario
   */
  validarFormatoFecha(fecha: string): boolean {
    if (!fecha) {
      return false;
    }
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    return fechaRegex.test(fecha.trim());
  }

  /**
   * Valida si una fecha es una fecha válida (no solo formato)
   * @param fecha - Fecha a validar en formato string (YYYY-MM-DD)
   * @returns true si la fecha es válida, false en caso contrario
   */
  validarFechaValida(fecha: string): boolean {
    if (!this.validarFormatoFecha(fecha)) {
      return false;
    }
    const fechaObj = new Date(fecha);
    return !isNaN(fechaObj.getTime());
  }

  /**
   * Valida si una persona es mayor a una edad específica basada en su fecha de nacimiento
   * @param fechaNacimiento - Fecha de nacimiento en formato string (YYYY-MM-DD)
   * @param edadMinima - Edad mínima requerida (por defecto 10 años)
   * @returns true si la persona tiene la edad mínima requerida, false en caso contrario
   */
  validarEdadMinima(fechaNacimiento: string, edadMinima: number = 10): boolean {
    if (!fechaNacimiento || !this.validarFechaValida(fechaNacimiento)) {
      return false;
    }
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    const fechaMinima = new Date(hoy.getFullYear() - edadMinima, hoy.getMonth(), hoy.getDate());
    return nacimiento <= fechaMinima;
  }

  /**
   * Valida si una persona es menor a una edad específica basada en su fecha de nacimiento
   * @param fechaNacimiento - Fecha de nacimiento en formato string (YYYY-MM-DD)
   * @param edadMaxima - Edad máxima permitida
   * @returns true si la persona tiene menos de la edad máxima, false en caso contrario
   */
  validarEdadMaxima(fechaNacimiento: string, edadMaxima: number): boolean {
    if (!fechaNacimiento || !this.validarFechaValida(fechaNacimiento)) {
      return false;
    }
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    const fechaMaxima = new Date(hoy.getFullYear() - edadMaxima, hoy.getMonth(), hoy.getDate());
    return nacimiento >= fechaMaxima;
  }

  /**
   * Valida si un campo de texto está vacío o solo contiene espacios
   * @param valor - Valor a validar
   * @returns true si el campo está vacío o solo contiene espacios, false en caso contrario
   */
  esCampoVacio(valor: string | null | undefined): boolean {
    return !valor || valor.trim() === '';
  }

  /**
   * Valida la longitud de un texto
   * @param texto - Texto a validar
   * @param longitudMinima - Longitud mínima requerida
   * @param longitudMaxima - Longitud máxima permitida (opcional)
   * @returns true si el texto cumple con las longitudes especificadas, false en caso contrario
   */
  validarLongitudTexto(texto: string, longitudMinima: number, longitudMaxima?: number): boolean {
    if (!texto) {
      return longitudMinima === 0;
    }
    const longitud = texto.trim().length;
    if (longitud < longitudMinima) {
      return false;
    }
    if (longitudMaxima !== undefined && longitud > longitudMaxima) {
      return false;
    }
    return true;
  }

  /**
   * Valida si un teléfono tiene el formato correcto
   * @param telefono - Teléfono a validar
   * @param longitudMinima - Longitud mínima del teléfono (por defecto 7)
   * @param longitudMaxima - Longitud máxima del teléfono (por defecto 15)
   * @returns true si el teléfono es válido, false en caso contrario
   */
  validarTelefono(telefono: string, longitudMinima: number = 7, longitudMaxima: number = 15): boolean {
    if (!telefono) {
      return false;
    }
    const telefonoLimpio = telefono.trim().replace(/[\s\-\(\)]/g, '');
    const telefonoRegex = /^\d+$/;
    return telefonoRegex.test(telefonoLimpio) && 
           this.validarLongitudTexto(telefonoLimpio, longitudMinima, longitudMaxima);
  }

  /**
   * Valida múltiples campos requeridos y retorna un array con los nombres de los campos vacíos
   * @param campos - Objeto con los campos a validar { nombreCampo: valor }
   * @returns Array con los nombres de los campos que están vacíos
   */
  validarCamposRequeridos(campos: { [key: string]: string | null | undefined }): string[] {
    const camposVacios: string[] = [];
    
    for (const [nombre, valor] of Object.entries(campos)) {
      if (this.esCampoVacio(valor)) {
        camposVacios.push(nombre);
      }
    }
    
    return camposVacios;
  }

  /**
   * Valida si un número está dentro de un rango
   * @param numero - Número a validar
   * @param minimo - Valor mínimo permitido
   * @param maximo - Valor máximo permitido
   * @returns true si el número está en el rango, false en caso contrario
   */
  validarRango(numero: number, minimo: number, maximo: number): boolean {
    return numero >= minimo && numero <= maximo;
  }

  /**
   * Valida si un string contiene solo letras (y espacios opcionales)
   * @param texto - Texto a validar
   * @param permitirEspacios - Si se permiten espacios (por defecto true)
   * @returns true si el texto contiene solo letras, false en caso contrario
   */
  validarSoloLetras(texto: string, permitirEspacios: boolean = true): boolean {
    if (!texto) {
      return false;
    }
    const regex = permitirEspacios ? /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/ : /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/;
    return regex.test(texto.trim());
  }

  /**
   * Valida si un string contiene solo números
   * @param texto - Texto a validar
   * @returns true si el texto contiene solo números, false en caso contrario
   */
  validarSoloNumeros(texto: string): boolean {
    if (!texto) {
      return false;
    }
    const regex = /^\d+$/;
    return regex.test(texto.trim());
  }

  /**
   * Valida si una contraseña cumple con los requisitos de seguridad
   * @param password - Contraseña a validar
   * @param longitudMinima - Longitud mínima requerida (por defecto 6)
   * @param requiereMayuscula - Si requiere al menos una mayúscula (por defecto false)
   * @param requiereMinuscula - Si requiere al menos una minúscula (por defecto false)
   * @param requiereNumero - Si requiere al menos un número (por defecto false)
   * @param requiereEspecial - Si requiere al menos un carácter especial (por defecto false)
   * @returns Objeto con el resultado de la validación y mensajes de error si los hay
   */
  validarPassword(
    password: string,
    longitudMinima: number = 6,
    requiereMayuscula: boolean = false,
    requiereMinuscula: boolean = false,
    requiereNumero: boolean = false,
    requiereEspecial: boolean = false
  ): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!password) {
      errores.push('La contraseña es requerida');
      return { valido: false, errores };
    }

    if (password.length < longitudMinima) {
      errores.push(`La contraseña debe tener al menos ${longitudMinima} caracteres`);
    }

    if (requiereMayuscula && !/[A-Z]/.test(password)) {
      errores.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (requiereMinuscula && !/[a-z]/.test(password)) {
      errores.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (requiereNumero && !/\d/.test(password)) {
      errores.push('La contraseña debe contener al menos un número');
    }

    if (requiereEspecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errores.push('La contraseña debe contener al menos un carácter especial');
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Valida si una URL tiene el formato correcto
   * @param url - URL a validar
   * @returns true si la URL es válida, false en caso contrario
   */
  validarURL(url: string): boolean {
    if (!url) {
      return false;
    }
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida si un número de tarjeta de crédito tiene el formato correcto (algoritmo de Luhn)
   * @param numeroTarjeta - Número de tarjeta a validar
   * @returns true si el número de tarjeta es válido, false en caso contrario
   */
  validarNumeroTarjeta(numeroTarjeta: string): boolean {
    if (!numeroTarjeta) {
      return false;
    }
    const numeroLimpio = numeroTarjeta.replace(/\s/g, '');
    if (!/^\d+$/.test(numeroLimpio) || numeroLimpio.length < 13 || numeroLimpio.length > 19) {
      return false;
    }

    // Algoritmo de Luhn
    let suma = 0;
    let esPar = false;
    for (let i = numeroLimpio.length - 1; i >= 0; i--) {
      let digito = parseInt(numeroLimpio[i], 10);
      if (esPar) {
        digito *= 2;
        if (digito > 9) {
          digito -= 9;
        }
      }
      suma += digito;
      esPar = !esPar;
    }
    return suma % 10 === 0;
  }
}

