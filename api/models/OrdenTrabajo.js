const mongoose = require('mongoose');

const ordenTrabajoSchema = new mongoose.Schema(
    {
        codigo_Orden: {
            type: String,
            required: true,
        },
        pedido_id: {
            type: String,
            required: true,
        },
        producto_id: {
            type: String,
            required: true,
        },
        cantidad_a_realizar: {
            type: Object,
            required: true,
        },
        cantidad_realizada: {
            type: Number,
            required: true,
        },
        estado: { // 1. En espera 2. En proceso 3. Terminado
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('OrdenesTrabajo', ordenTrabajoSchema);
