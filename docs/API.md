# API
GET /api/debate → debate
POST /api/block {parentId, text} → debate
PATCH /api/block/:id {text?, order?} → debate (text pushes previous to history)
DELETE /api/block/:id?cascade=true → debate (delete subtree; reindex)
PUT /api/debate?resolve=true|false → debate
