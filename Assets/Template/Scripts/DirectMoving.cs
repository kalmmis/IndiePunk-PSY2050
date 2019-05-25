using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// This script moves the attached object along the Y-axis with the defined speed
/// </summary>
public class DirectMoving : MonoBehaviour {

    [Tooltip("Moving speed on Y axis in local space")]
    public float speed;
    public delegate void MyDelegate(Transform p);
    public MyDelegate moveFunc = null;
    //moving the object with the defined speed
    private void Update()
    {
        if (moveFunc != null)
        {
            moveFunc(transform);
        }
    }
}
