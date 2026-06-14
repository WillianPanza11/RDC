import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  // Patrón de caracteres permitidos en el usuario
  private readonly USERNAME_PATTERN = /^[a-zA-Z0-9._\-@]+$/;
  // Secuencias sospechosas bloqueadas en la contraseña (XSS, SQL injection)
  private readonly SUSPICIOUS_PASSWORD = /(<|>|--|\/\*|\*\/|xp_|script)/i;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.maxLength(50),
        this.usernameValidator()
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(4),
        Validators.maxLength(100),
        this.passwordSecurityValidator()
      ]]
    });
  }

  private usernameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      return this.USERNAME_PATTERN.test(value) ? null : { caracteresInvalidos: true };
    };
  }

  private passwordSecurityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      return this.SUSPICIOUS_PASSWORD.test(value) ? { caracteresInvalidos: true } : null;
    };
  }

  // Bloquea en tiempo real caracteres no permitidos en el campo usuario
  filtrarUsuario(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^a-zA-Z0-9._\-@]/g, '');
    if (limpio !== input.value) {
      input.value = limpio;
      this.loginForm.get('username')?.setValue(limpio, { emitEvent: false });
      this.loginForm.get('username')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (error) => {
        this.isLoading.set(false);
        if (error.status === 401) {
          this.errorMessage.set('Usuario o contraseña incorrectos');
        } else if (error.status === 0) {
          this.errorMessage.set('No se pudo conectar con el servidor');
        } else {
          this.errorMessage.set('Error al iniciar sesión. Por favor, intente nuevamente.');
        }
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
