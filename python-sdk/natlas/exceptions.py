"""N-ATLaS SDK exceptions.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""


class NatlasError(Exception):
    """Base error for the SDK.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """


class ConfigurationError(NatlasError):
    """Raised when client configuration is missing or invalid."""


class LocalDependencyError(ConfigurationError):
    """Raised when optional local inference dependencies are unavailable."""


class LocalInferenceError(NatlasError):
    """Raised when local model inference fails."""


class APIError(NatlasError):
    """Base error for hosted API failures."""


class APIConnectionError(APIError):
    """Raised when the hosted API cannot be reached."""


class APITimeoutError(APIConnectionError):
    """Raised when a hosted API request times out."""


class APIStatusError(APIError):
    """Raised for an error response from the hosted API.

    N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        response_text: str | None = None,
        method: str | None = None,
        url: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_text = response_text
        self.method = method
        self.url = url


class APIResponseValidationError(APIError):
    """Raised when a hosted response does not match the typed SDK contract."""


class StreamProtocolError(APIError):
    """Raised when a hosted streaming response is malformed."""
