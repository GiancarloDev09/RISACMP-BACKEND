const mongoose = require('mongoose');

const almacenproductosSchema = new mongoose.Schema(
    {
        almacen_id: {
            type: String,
            required: true,
        },
        producto_id: {
            type: String,
            required: true,
        },
        cantidad: {
            type: Number,
            required: true,
        },
        unidad_medida_id: {
            type: String,
            required: true,
        },
        estado: { // 1. Vendido 2. En almacén 3. Desechado
            type: String,
            required: true,
        },
        origen_id: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('AlmacenProducto', almacenproductosSchema);
