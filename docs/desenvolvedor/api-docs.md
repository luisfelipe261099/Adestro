# Documentação de API

## Base URL

```
https://adestro.com/api
```

## Autenticação

Todas as requisições devem incluir o header:

```
Authorization: Bearer <TOKEN>
```

Token obtido via `/api/auth/signin`

---

## Endpoints

### 1. Clientes

#### Listar Clientes

```http
GET /api/clients
```

**Response:**
```json
[
  {
    "id": "client_001",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "(11) 98765-4321",
    "dogs": [
      {
        "id": "dog_001",
        "name": "Rex",
        "breed": "Golden Retriever",
        "age": 3
      }
    ]
  }
]
```

#### Criar Cliente

```http
POST /api/clients
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "(11) 98765-4321",
  "dogs": [
    {
      "name": "Rex",
      "breed": "Golden Retriever",
      "age": 3,
      "size": "large"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "client_001",
  "message": "Cliente criado com sucesso"
}
```

#### Obter Cliente

```http
GET /api/clients/{id}
```

**Response:**
```json
{
  "id": "client_001",
  "name": "João Silva",
  "email": "joao@email.com",
  "createdAt": "2026-05-14T10:30:00Z",
  "trainings": [
    {
      "id": "training_001",
      "date": "2026-05-14",
      "notes": "Bom progresso em obediência"
    }
  ]
}
```

#### Atualizar Cliente

```http
PUT /api/clients/{id}
Content-Type: application/json

{
  "name": "João Silva Santos",
  "phone": "(11) 99999-9999"
}
```

#### Deletar Cliente

```http
DELETE /api/clients/{id}
```

---

### 2. Treinos

#### Registrar Treino

```http
POST /api/trainer/plan
Content-Type: application/json

{
  "session_id": "session_001",
  "trainer_notes": "Trabalhamos comando 'senta' com reforço positivo. Cão respondeu bem em 80% das tentativas.",
  "dog_id": "dog_001",
  "duration_minutes": 45,
  "techniques_used": ["reforço_positivo", "clicker"],
  "video_tags": ["comando", "obediência", "reforço_positivo"]
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "session_001",
  "analysis": {
    "strengths": ["Resposta positiva aos comandos"],
    "improvements": ["Melhorar concentração em ambientes com estímulos"],
    "next_steps": ["Avançar para comandos mais complexos"],
    "estimated_progress": 75,
    "recommended_exercises": ["Começar treinamento de 'deita'"],
    "summary_for_tutor": "..."
  }
}
```

#### Listar Treinos

```http
GET /api/trainer/plan?clientId=client_001&limit=10&offset=0
```

**Query Parameters:**
- `clientId`: ID do cliente
- `limit`: Número de resultados (padrão: 10)
- `offset`: Paginação (padrão: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "training_001",
      "date": "2026-05-14",
      "dogName": "Rex",
      "notes": "...",
      "analysis": { ... }
    }
  ],
  "total": 45,
  "limit": 10,
  "offset": 0
}
```

---

### 3. Análise de IA

#### Analisar Sessão

```http
POST /api/ia/analyze-session
Content-Type: application/json

{
  "session_id": "session_001",
  "trainer_notes": "Cão respondeu muito bem aos comandos...",
  "dog_id": "dog_001",
  "duration_minutes": 45,
  "techniques_used": ["reforço_positivo"]
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "session_001",
  "dog_id": "dog_001",
  "analysis": {
    "strengths": ["Resposta excelente aos comandos"],
    "improvements": ["Trabalhar socialização"],
    "next_steps": ["Avançar para comandos avançados"],
    "estimated_progress": 82,
    "recommended_exercises": ["Treino de 'deita'"],
    "summary_for_tutor": "Na sessão de hoje, 45 minutos, seu cão demonstrou excelente desempenho..."
  },
  "timestamp": "2026-05-14T10:30:00Z"
}
```

#### Recuperar Análise

```http
GET /api/ia/analyze-session?session_id=session_001
```

**Response:**
```json
{
  "analysis": { ... }
}
```

---

### 4. Gamificação

#### Obter Pontos do Usuário

```http
GET /api/portal-public/{token}/gamification
```

**Response:**
```json
{
  "state": {
    "points": 350,
    "level": 4,
    "xpInLevel": 50,
    "xpToNext": 50,
    "badges": [
      {
        "id": "first_task",
        "label": "Primeira tarefa",
        "icon": "🎯",
        "unlocked": true
      }
    ],
    "totalTasksCompleted": 15,
    "streakDays": 5
  },
  "earned": 20,
  "reason": "Tarefa concluída"
}
```

#### Aplicar Ação (Ganhar Pontos)

```http
POST /api/portal-public/{token}/gamification
Content-Type: application/json

{
  "action": "task_completed",
  "taskId": "task_001"
}
```

**Ações disponíveis:**
- `task_completed`: Tarefa concluída (+20 pontos)
- `task_uncompleted`: Tarefa não concluída (-20 pontos)
- `video_watched`: Vídeo assistido (+15 pontos)
- `feedback_sent`: Feedback enviado (+10 pontos)
- `training_completed`: Treino registrado (+10 pontos)
- `multiple_techniques`: Múltiplas técnicas (+60 pontos)

**Response:**
```json
{
  "state": { ... },
  "earned": 20,
  "reason": "Tarefa concluída"
}
```

---

### 5. Portais

#### Portal Público do Tutor

```http
GET /api/portal-public/{token}
```

Acessa dados públicos com token (sem autenticação)

**Response:**
```json
{
  "dogName": "Rex",
  "tutor": {
    "name": "João Silva"
  },
  "tasks": [...],
  "videos": [...],
  "gamification": {...}
}
```

---

## Códigos de Erro

| Código | Significado |
|--------|-----------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

**Exemplo de Erro:**
```json
{
  "error": "Unauthorized",
  "message": "Token inválido ou expirado"
}
```

---

## Rate Limiting

- **Limite**: 100 requisições por minuto
- **Header**: `X-RateLimit-Remaining`

---

## Exemplos de Uso

### cURL

```bash
# Listar clientes
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://adestro.com/api/clients

# Registrar treino
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"session_001",...}' \
  https://adestro.com/api/trainer/plan
```

### JavaScript (Fetch)

```javascript
const token = "YOUR_TOKEN";

// Listar clientes
const response = await fetch("https://adestro.com/api/clients", {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

const clients = await response.json();
```

### Python (Requests)

```python
import requests

headers = {"Authorization": f"Bearer {token}"}

# Listar clientes
response = requests.get("https://adestro.com/api/clients", headers=headers)
clients = response.json()

# Registrar treino
data = {
  "session_id": "session_001",
  "trainer_notes": "..."
}
response = requests.post(
  "https://adestro.com/api/trainer/plan",
  json=data,
  headers=headers
)
```

---

**Versão**: 1.0  
**Última atualização**: Maio de 2026
