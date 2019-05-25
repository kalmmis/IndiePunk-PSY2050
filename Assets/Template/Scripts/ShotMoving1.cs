using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ShotMoving1 : MonoBehaviour
{
    [Tooltip("Moving speed on Y axis in local space")]
    public float speed;

    //moving the object with the defined speed
    private void Update()
    {
        transform.Translate(Vector3.down * speed * Time.deltaTime);
    }
}
