import "./QuantityStepper.css";

function QuantityStepper({ quantity, onDecrease, onIncrease }) {
  return (
    <div className="quantity-stepper" aria-label="Update quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={onDecrease}
      >
        -
      </button>
      <span>{quantity}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  );
}

export default QuantityStepper;
