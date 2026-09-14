---
paths:
  - app/Providers/AppServiceProvider.php
---

# Providers

## Keep Schema::defaultStringLength(191) for shared hosting MySQL
Target hosting (MySQL on vmasdani.my.id) enforces a 1000-byte max key length, so a utf8mb4 `varchar(255)` primary/indexed key fails with SQLSTATE[42000] 1071. `Schema::defaultStringLength(191)` is set in AppServiceProvider::boot() and must stay. Without it, `php artisan migrate` aborts on `password_reset_tokens.email`.
