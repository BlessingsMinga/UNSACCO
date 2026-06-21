$c = Get-Content "prisma/schema.prisma" -Raw
$c = $c -replace "loanGuarantees   LoanGuarantor\[\]\r?\n    loanApplications LoanApplication\[\]", "loanGuarantees   LoanGuarantor[]"
$c | Set-Content "prisma/schema.prisma" -NoNewline
Write-Host "Done"