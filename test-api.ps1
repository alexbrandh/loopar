# Script para probar la API de postcards
param(
    [string]$BaseUrl = "http://localhost:3000"
)

$url = "$BaseUrl/api/postcards/550e8400-e29b-41d4-a716-446655440001"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -ContentType "application/json"
    Write-Host "Status: Success"
    Write-Host "Response (raw):"
    $response | ConvertTo-Json -Depth 10

    if ($response.data) {
        Write-Host "`nResponse.data:"
        $response.data | ConvertTo-Json -Depth 10
        if ($response.data.nft_descriptors) {
            Write-Host "`nNFT Descriptors:"
            $response.data.nft_descriptors | ConvertTo-Json -Depth 5
        } else {
            Write-Host "`nNo nft_descriptors in response.data"
        }
    } else {
        Write-Host "`nNo data field in response"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
}